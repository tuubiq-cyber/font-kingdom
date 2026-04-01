import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowRight,
  LogOut,
  CheckCircle,
  Clock,
  Brain,
  AlertTriangle,
  Send,
  Eye,
  Link as LinkIcon,
  FileUp,
  MessageSquare,
  Type,
  X,
  Search,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { generatePerceptualHash } from "@/lib/imageProcessing";
import QueueImage from "@/components/QueueImage";
import { getQueueImageUrl } from "@/lib/storageUtils";

interface FontRecord {
  font_name: string;
  download_url: string | null;
  font_file_url: string | null;
}

interface QueueItem {
  id: string;
  user_uploaded_image: string;
  status: string;
  assigned_font_name: string | null;
  admin_download_url: string | null;
  user_confirmation: boolean | null;
  needs_correction: boolean | null;
  created_at: string;
  resolved_at: string | null;
  user_id: string | null;
  query_text: string | null;
  rejection_reason: string | null;
}

const AdminQueue = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [fontTypeInput, setFontTypeInput] = useState<Record<string, "free" | "paid">>({});
  const [fontNameInput, setFontNameInput] = useState<Record<string, string>>({});
  const [downloadUrlInput, setDownloadUrlInput] = useState<Record<string, string>>({});
  const [fontFileInput, setFontFileInput] = useState<Record<string, File | null>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});
  const [knownFonts, setKnownFonts] = useState<FontRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Load previously resolved fonts for autocomplete
  useEffect(() => {
    const loadKnownFonts = async () => {
      // From font_dataset
      const { data: dataset } = await supabase
        .from("font_dataset")
        .select("font_name, metadata_json");
      
      // From resolved queue items
      const { data: resolved } = await supabase
        .from("manual_identification_queue")
        .select("assigned_font_name, admin_download_url")
        .eq("status", "resolved");

      const fontsMap = new Map<string, FontRecord>();

      dataset?.forEach((d: any) => {
        const meta = d.metadata_json as any;
        fontsMap.set(d.font_name, {
          font_name: d.font_name,
          download_url: meta?.download_url || null,
          font_file_url: meta?.font_file_url || null,
        });
      });

      resolved?.forEach((r: any) => {
        if (r.assigned_font_name && !fontsMap.has(r.assigned_font_name)) {
          fontsMap.set(r.assigned_font_name, {
            font_name: r.assigned_font_name,
            download_url: r.admin_download_url || null,
            font_file_url: null,
          });
        }
      });

      setKnownFonts(Array.from(fontsMap.values()));
    };
    loadKnownFonts();
  }, []);

  const handleAutofill = (itemId: string, font: FontRecord) => {
    setFontNameInput((p) => ({ ...p, [itemId]: font.font_name }));
    if (font.download_url) {
      setDownloadUrlInput((p) => ({ ...p, [itemId]: font.download_url! }));
    }
  };


  const fetchQueue = async () => {
    const { data, error } = await supabase
      .from("manual_identification_queue")
      .select("*")
      .order("needs_correction", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error) setItems((data as unknown as QueueItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
  }, [user]);

  // Realtime: watch for user confirmations / corrections
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("admin-queue-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "manual_identification_queue" },
        (payload) => {
          const updated = payload.new as unknown as QueueItem;
          setItems((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r))
          );
          if (updated.needs_correction && updated.status === "pending") {
            toast.warning("طلب اعيد للمراجعة - المستخدم لم يوافق على النتيجة");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const uploadFontFile = async (file: File, fontName: string): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'ttf';
      const path = `font-files/${fontName.replace(/\s+/g, '_')}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage.from("fonts").upload(path, file);
      if (error) throw error;
      const { data: signedData, error: signError } = await supabase.storage.from("fonts").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signError || !signedData?.signedUrl) throw signError || new Error("Signed URL failed");
      return signedData.signedUrl;
    } catch (e) {
      console.warn("Font file upload failed:", e);
      return null;
    }
  };

  const handleResolve = async (item: QueueItem) => {
    const name = fontNameInput[item.id]?.trim();
    if (!name) {
      toast.error("يرجى ادخال اسم الخط");
      return;
    }

    const type = fontTypeInput[item.id] || "free";
    const downloadUrl = downloadUrlInput[item.id]?.trim() || null;

    if (type === "paid" && !downloadUrl) {
      toast.error("يرجى إدخال رابط الشراء للخط المدفوع");
      return;
    }

    setResolvingId(item.id);
    try {
      const fontFile = fontTypeInput[item.id] === "paid" ? null : (fontFileInput[item.id] || null);
      const notes = notesInput[item.id]?.trim() || null;

      // Upload font file if provided
      let fontFileUrl: string | null = null;
      if (fontFile) {
        fontFileUrl = await uploadFontFile(fontFile, name);
        if (!fontFileUrl) {
          toast.warning("فشل رفع ملف الخط، سيتم المتابعة بدونه");
        }
      }

      const { error: updateError } = await supabase
        .from("manual_identification_queue")
        .update({
          status: "resolved",
          assigned_font_name: name,
          admin_download_url: fontFileUrl || downloadUrl,
          resolved_by: user?.id || null,
          resolved_at: new Date().toISOString(),
          needs_correction: false,
          is_notified: true,
        } as any)
        .eq("id", item.id);

      if (updateError) throw updateError;

      // Add to font_dataset for future training (optional, don't block on failure)
      try {
        let visualHash: string | null = null;
        try {
          visualHash = await generatePerceptualHash(item.user_uploaded_image);
        } catch {}
        await supabase.from("font_dataset").insert({
          font_name: name,
          sample_image_url: item.user_uploaded_image,
          metadata_json: {
            source: "manual_review",
            download_url: downloadUrl,
            font_file_url: fontFileUrl,
            admin_notes: notes,
          },
          visual_hash: visualHash,
          verified_by_admin: true,
        } as any);
      } catch {}

      toast.success("تم ارسال النتيجة للمستخدم واضافة العينة للتدريب");
      fetchQueue();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطا اثناء الحل");
    } finally {
      setResolvingId(null);
    }
  };

  const handleReject = async (itemId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from("manual_identification_queue")
        .update({
          status: "rejected",
          rejection_reason: reason || null,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id || null,
        } as any)
        .eq("id", itemId);
      if (error) throw error;
      toast.success("تم رفض الطلب");
      fetchQueue();
    } catch (err) {
      console.error("Reject error:", err);
      toast.error("حدث خطأ أثناء رفض الطلب");
    }
  };
  const handleRestore = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("manual_identification_queue")
        .update({
          status: "pending",
          rejection_reason: null,
          resolved_at: null,
          resolved_by: null,
        } as any)
        .eq("id", itemId);
      if (error) throw error;
      toast.success("تم استعادة الطلب إلى المعلقة");
      fetchQueue();
    } catch (err) {
      console.error("Restore error:", err);
      toast.error("حدث خطأ أثناء استعادة الطلب");
    }
  };

  const handleDeleteRejected = async (itemId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) return;
    try {
      const { error } = await supabase
        .from("manual_identification_queue")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
      toast.success("تم حذف الطلب نهائياً");
      fetchQueue();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("حدث خطأ أثناء حذف الطلب");
    }
  };

  const handleDeleteAllRejected = async () => {
    if (!confirm("هل أنت متأكد من حذف جميع الطلبات المرفوضة نهائياً؟")) return;
    try {
      const { error } = await supabase
        .from("manual_identification_queue")
        .delete()
        .eq("status", "rejected");
      if (error) throw error;
      toast.success("تم حذف جميع الطلبات المرفوضة");
      fetchQueue();
    } catch (err) {
      console.error("Delete all rejected error:", err);
      toast.error("حدث خطأ أثناء حذف الطلبات");
    }
  };


  const pending = items.filter((i) => i.status === "pending");
  const needsCorrection = pending.filter((i) => i.needs_correction);
  const normalPending = pending.filter((i) => !i.needs_correction);
  const resolved = items.filter((i) => i.status === "resolved");
  const rejected = items.filter((i) => i.status === "rejected");

  const filteredPending = useMemo(() => {
    let list = normalPending;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.query_text?.toLowerCase().includes(q) ||
          i.user_id?.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return list;
  }, [normalPending, searchQuery, sortOrder]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="py-6 border-b border-border">
        <div className="container max-w-3xl mx-auto px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            طابور المراجعة اليدوية
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="btn-outline flex items-center gap-2 text-sm px-4 py-2"
            >
              <ArrowRight className="w-4 h-4" />
              المكتبة
            </Link>
            <Link
              to="/train"
              className="btn-outline flex items-center gap-2 text-sm px-4 py-2"
            >
              <Brain className="w-4 h-4" />
              التدريب
            </Link>
            <button
              onClick={signOut}
              className="btn-outline flex items-center gap-2 text-sm px-4 py-2 text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Needs Correction - Priority */}
        {needsCorrection.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-foreground font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              تحتاج تصحيح ({needsCorrection.length})
            </h2>
            <div className="space-y-3">
              {needsCorrection.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  fontName={fontNameInput[item.id] || ""}
                  downloadUrl={downloadUrlInput[item.id] || ""}
                  fontFile={fontFileInput[item.id] || null}
                  notes={notesInput[item.id] || ""}
                  fontType={fontTypeInput[item.id] || "free"}
                  knownFonts={knownFonts}
                  onAutofill={(f) => handleAutofill(item.id, f)}
                  onFontNameChange={(v) => setFontNameInput((p) => ({ ...p, [item.id]: v }))}
                  onDownloadUrlChange={(v) => setDownloadUrlInput((p) => ({ ...p, [item.id]: v }))}
                  onFontFileChange={(f) => setFontFileInput((p) => ({ ...p, [item.id]: f }))}
                  onNotesChange={(v) => setNotesInput((p) => ({ ...p, [item.id]: v }))}
                  onFontTypeChange={(t) => setFontTypeInput((p) => ({ ...p, [item.id]: t }))}
                  onResolve={() => handleResolve(item)}
                  onReject={(reason) => handleReject(item.id, reason)}
                  resolving={resolvingId === item.id}
                  onPreview={() => setPreviewImage(item.user_uploaded_image)}
                  isCorrection
                />
              ))}
            </div>
          </section>
        )}

        {/* Normal Pending */}
        <section className="space-y-4">
          <h2 className="text-foreground font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            طلبات معلقة ({normalPending.length})
          </h2>

          {normalPending.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="بحث بالنص أو المعرّف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  dir="rtl"
                />
              </div>
              <button
                onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border bg-card transition-colors shrink-0"
              >
                {sortOrder === "newest" ? (
                  <><ChevronDown className="w-3.5 h-3.5" /> الأحدث</>
                ) : (
                  <><ChevronUp className="w-3.5 h-3.5" /> الأقدم</>
                )}
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : normalPending.length === 0 ? (
            <div className="text-center py-8 font-card">
              <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">لا توجد طلبات معلقة</p>
            </div>
          ) : filteredPending.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              لا توجد نتائج مطابقة للبحث
            </p>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  fontName={fontNameInput[item.id] || ""}
                  downloadUrl={downloadUrlInput[item.id] || ""}
                  fontFile={fontFileInput[item.id] || null}
                  notes={notesInput[item.id] || ""}
                  fontType={fontTypeInput[item.id] || "free"}
                  knownFonts={knownFonts}
                  onAutofill={(f) => handleAutofill(item.id, f)}
                  onFontNameChange={(v) => setFontNameInput((p) => ({ ...p, [item.id]: v }))}
                  onDownloadUrlChange={(v) => setDownloadUrlInput((p) => ({ ...p, [item.id]: v }))}
                  onFontFileChange={(f) => setFontFileInput((p) => ({ ...p, [item.id]: f }))}
                  onNotesChange={(v) => setNotesInput((p) => ({ ...p, [item.id]: v }))}
                  onFontTypeChange={(t) => setFontTypeInput((p) => ({ ...p, [item.id]: t }))}
                  onResolve={() => handleResolve(item)}
                  onReject={(reason) => handleReject(item.id, reason)}
                  resolving={resolvingId === item.id}
                  onPreview={() => setPreviewImage(item.user_uploaded_image)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Resolved */}
        <section className="space-y-4">
          <h2 className="text-foreground font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            طلبات مكتملة ({resolved.length})
          </h2>

          {resolved.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              لا توجد طلبات مكتملة بعد
            </p>
          ) : (
            <div className="space-y-2">
              {resolved.map((item) => (
                <ResolvedCard key={item.id} item={item} onPreview={() => setPreviewImage(item.user_uploaded_image)} />
              ))}
            </div>
          )}
        </section>
        {/* Rejected */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground font-semibold flex items-center gap-2">
              <X className="w-4 h-4 text-destructive" />
              طلبات مرفوضة ({rejected.length})
            </h2>
            {rejected.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const headers = ["ID", "النص", "سبب الرفض", "التاريخ"];
                    const rows = rejected.map((r) => [
                      r.id,
                      r.query_text || "",
                      r.rejection_reason || "",
                      new Date(r.created_at).toLocaleDateString("ar-SA"),
                    ]);
                    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "rejected-requests.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("تم تصدير الطلبات المرفوضة");
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent px-3 py-1.5 rounded-lg transition-colors border border-border"
                >
                  <Download className="w-3.5 h-3.5" />
                  تصدير CSV
                </button>
                <button
                  onClick={handleDeleteAllRejected}
                  className="flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors border border-destructive/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف الكل
                </button>
              </div>
            )}
          </div>

          {rejected.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              لا توجد طلبات مرفوضة
            </p>
          ) : (
            <div className="space-y-2">
              {rejected.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 bg-card border border-destructive/20 rounded-lg px-4 py-3"
                >
                  <QueueImage
                    src={item.user_uploaded_image}
                    alt=""
                    className="w-10 h-10 rounded object-cover bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-destructive font-medium text-sm">مرفوض</p>
                    {item.rejection_reason && (
                      <p className="text-muted-foreground text-xs mt-1">
                        السبب: {item.rejection_reason}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs mt-1">
                      {item.resolved_at
                        ? new Date(item.resolved_at).toLocaleDateString("ar-SA")
                        : new Date(item.created_at).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="flex items-center gap-1 text-xs text-primary hover:bg-primary/10 px-2 py-1.5 rounded-lg transition-colors"
                      title="استعادة الطلب"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      استعادة
                    </button>
                    <button
                      onClick={() => handleDeleteRejected(item.id)}
                      className="flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded-lg transition-colors"
                      title="حذف نهائي"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="معاينة"
            className="max-w-full max-h-[80vh] rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
};

// ─── Queue Card Component ────────────────────────────────
interface QueueCardProps {
  item: QueueItem;
  fontName: string;
  downloadUrl: string;
  fontFile: File | null;
  notes: string;
  fontType: "free" | "paid";
  knownFonts: FontRecord[];
  onAutofill: (font: FontRecord) => void;
  onFontNameChange: (v: string) => void;
  onDownloadUrlChange: (v: string) => void;
  onFontFileChange: (f: File | null) => void;
  onNotesChange: (v: string) => void;
  onFontTypeChange: (t: "free" | "paid") => void;
  onResolve: () => void;
  onReject: (reason: string) => void;
  resolving: boolean;
  onPreview: () => void;
  isCorrection?: boolean;
}

const QueueCard = ({
  item,
  fontName,
  downloadUrl,
  fontFile,
  notes,
  fontType,
  knownFonts,
  onAutofill,
  onFontNameChange,
  onDownloadUrlChange,
  onFontFileChange,
  onNotesChange,
  onFontTypeChange,
  onResolve,
  onReject,
  resolving,
  onPreview,
  isCorrection,
}: QueueCardProps) => {
  const fileInputId = `file-${item.id}`;
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!fontName || fontName.length < 2) return [];
    const q = fontName.toLowerCase();
    return knownFonts
      .filter((f) => f.font_name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [fontName, knownFonts]);

  return (
    <div
      className={`font-card space-y-3 ${
        isCorrection ? "border-destructive/30 bg-destructive/5" : ""
      }`}
    >
      {isCorrection && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="w-3.5 h-3.5" />
          المستخدم لم يوافق على النتيجة السابقة - يرجى اعادة التحقق
        </div>
      )}
      <div className="flex items-start gap-3">
        {item.query_text ? (
          <div className="w-20 h-20 rounded-lg bg-muted border border-border flex items-center justify-center">
            <Type className="w-6 h-6 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={item.user_uploaded_image}
            alt="صورة المستخدم"
            className="w-20 h-20 rounded-lg object-cover bg-muted cursor-pointer border border-border hover:border-primary/50 transition-colors"
            onClick={onPreview}
          />
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              {new Date(item.created_at).toLocaleDateString("ar-SA")} ·{" "}
              {new Date(item.created_at).toLocaleTimeString("ar-SA")}
            </p>
            <button
              onClick={onPreview}
              className="text-muted-foreground hover:text-foreground"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {item.query_text && (
            <div className="bg-muted/50 border border-border/30 rounded-lg px-3 py-2">
              <p className="text-[10px] text-muted-foreground mb-1">استفسار نصي:</p>
              <p className="text-foreground text-sm font-medium">{item.query_text}</p>
            </div>
          )}

          <div className="space-y-2">
            {/* Font name with autocomplete */}
            <div className="relative">
              <input
                type="text"
                value={fontName}
                onChange={(e) => {
                  onFontNameChange(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="اسم الخط (مطلوب)"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map((s) => (
                    <button
                      key={s.font_name}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onAutofill(s);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-right px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{s.font_name}</span>
                      {s.download_url && (
                        <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                          يحتوي رابط
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Free / Paid toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onFontTypeChange("free")}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                  fontType === "free"
                    ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                مجاني
              </button>
              <button
                type="button"
                onClick={() => onFontTypeChange("paid")}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                  fontType === "paid"
                    ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                مدفوع
              </button>
            </div>

            {/* Download URL - always shown */}
            <div className="flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="url"
                value={downloadUrl}
                onChange={(e) => onDownloadUrlChange(e.target.value)}
                placeholder={fontType === "paid" ? "رابط الشراء (مطلوب)" : "رابط التحميل (اختياري)"}
                dir="ltr"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {/* Font file upload - only for free fonts */}
            {fontType === "free" && (
              <>
                <input
                  id={fileInputId}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2,.zip"
                  className="hidden"
                  onChange={(e) => {
                    onFontFileChange(e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2 hover:border-primary/30 transition-colors">
                  <FileUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span
                    className="text-sm text-muted-foreground flex-1 truncate cursor-pointer"
                    onClick={() => document.getElementById(fileInputId)?.click()}
                  >
                    {fontFile ? fontFile.name : "ارفق ملف الخط (اختياري)"}
                  </span>
                  {fontFile && (
                    <button
                      type="button"
                      onClick={() => onFontFileChange(null)}
                      className="text-xs text-destructive hover:text-destructive/80"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Notes */}
            <div className="flex items-start gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-2.5" />
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="ملاحظات للمستخدم (اختياري)"
                rows={2}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
              />
            </div>
          </div>

          <button
            onClick={onResolve}
            disabled={resolving}
            className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-1.5"
          >
            {resolving ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                ارسال النتيجة للمستخدم
              </>
            )}
          </button>

          {showRejectForm ? (
            <div className="space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="سبب الرفض (اختياري)"
                rows={2}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-destructive/50 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onReject(rejectReason);
                    setShowRejectForm(false);
                    setRejectReason("");
                  }}
                  className="flex-1 py-2 text-sm flex items-center justify-center gap-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-4 h-4" />
                  تأكيد الرفض
                </button>
                <button
                  onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                  className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowRejectForm(true)}
              className="w-full py-2 text-sm flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="w-4 h-4" />
              رفض الطلب
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Resolved Card Component ────────────────────────────────
const ResolvedCard = ({ item, onPreview }: { item: QueueItem; onPreview: () => void }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-right"
      >
        <img
          src={item.user_uploaded_image}
          alt=""
          className="w-10 h-10 rounded object-cover bg-muted cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-medium text-sm truncate">
            {item.assigned_font_name ?? "غير محدد"}
          </p>
          <p className="text-muted-foreground text-xs">
            {item.resolved_at ? new Date(item.resolved_at).toLocaleDateString("ar-SA") : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {item.user_confirmation === true && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">مكتمل</span>
          )}
          {item.user_confirmation === false && (
            <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">مرفوض من المستخدم</span>
          )}
          {item.user_confirmation === null && (
            <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full">بانتظار الرد</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">اسم الخط</p>
              <p className="text-foreground font-medium">{item.assigned_font_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">تاريخ الحل</p>
              <p className="text-foreground">{item.resolved_at ? new Date(item.resolved_at).toLocaleString("ar-SA") : "—"}</p>
            </div>
          </div>

          {item.admin_download_url && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">رابط التحميل</p>
              <a
                href={item.admin_download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm flex items-center gap-1 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                تحميل الخط
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {item.query_text && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">استفسار المستخدم</p>
              <p className="text-foreground text-sm bg-muted/50 rounded px-2 py-1">{item.query_text}</p>
            </div>
          )}

          <div>
            <p className="text-muted-foreground text-xs mb-1">حالة تأكيد المستخدم</p>
            <p className="text-foreground text-sm">
              {item.user_confirmation === true ? "✅ أكد المستخدم أن الخط صحيح" :
               item.user_confirmation === false ? "❌ المستخدم رفض النتيجة" :
               "⏳ بانتظار رد المستخدم"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQueue;
