import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { generatePerceptualHash } from "@/lib/imageProcessing";

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
}

const AdminQueue = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [fontNameInput, setFontNameInput] = useState<Record<string, string>>({});
  const [downloadUrlInput, setDownloadUrlInput] = useState<Record<string, string>>({});
  const [fontFileInput, setFontFileInput] = useState<Record<string, File | null>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

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
    if (user) fetchQueue();
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
      const { data } = supabase.storage.from("fonts").getPublicUrl(path);
      return data.publicUrl;
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

    setResolvingId(item.id);
    try {
      const downloadUrl = downloadUrlInput[item.id]?.trim() || null;
      const fontFile = fontFileInput[item.id] || null;

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
          resolved_by: user!.id,
          resolved_at: new Date().toISOString(),
          needs_correction: false,
          is_notified: true,
        } as any)
        .eq("id", item.id);

      if (updateError) throw updateError;

      // Add to font_dataset for future training
      let visualHash: string | null = null;
      try {
        visualHash = await generatePerceptualHash(item.user_uploaded_image);
      } catch (e) {
        console.warn("Hash failed:", e);
      }

      await supabase.from("font_dataset").insert({
        font_name: name,
        sample_image_url: item.user_uploaded_image,
        metadata_json: {
          source: "manual_review",
          download_url: downloadUrl,
          font_file_url: fontFileUrl,
        },
        visual_hash: visualHash,
        verified_by_admin: true,
      } as any);

      toast.success("تم ارسال النتيجة للمستخدم واضافة العينة للتدريب");
      fetchQueue();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطا اثناء الحل");
    } finally {
      setResolvingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const pending = items.filter((i) => i.status === "pending");
  const needsCorrection = pending.filter((i) => i.needs_correction);
  const normalPending = pending.filter((i) => !i.needs_correction);
  const resolved = items.filter((i) => i.status === "resolved");

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
                  onFontNameChange={(v) =>
                    setFontNameInput((p) => ({ ...p, [item.id]: v }))
                  }
                  onDownloadUrlChange={(v) =>
                    setDownloadUrlInput((p) => ({ ...p, [item.id]: v }))
                  }
                  onResolve={() => handleResolve(item)}
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
            <Clock className="w-4 h-4 text-yellow-500" />
            طلبات معلقة ({normalPending.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : normalPending.length === 0 ? (
            <div className="text-center py-8 font-card">
              <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">لا توجد طلبات معلقة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {normalPending.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  fontName={fontNameInput[item.id] || ""}
                  downloadUrl={downloadUrlInput[item.id] || ""}
                  onFontNameChange={(v) =>
                    setFontNameInput((p) => ({ ...p, [item.id]: v }))
                  }
                  onDownloadUrlChange={(v) =>
                    setDownloadUrlInput((p) => ({ ...p, [item.id]: v }))
                  }
                  onResolve={() => handleResolve(item)}
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
            طلبات محلولة ({resolved.length})
          </h2>

          {resolved.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              لا توجد طلبات محلولة بعد
            </p>
          ) : (
            <div className="space-y-2">
              {resolved.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-card border border-border/50 rounded-lg px-4 py-3"
                >
                  <img
                    src={item.user_uploaded_image}
                    alt=""
                    className="w-10 h-10 rounded object-cover bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">
                      {item.assigned_font_name ?? "غير محدد"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {item.resolved_at
                        ? new Date(item.resolved_at).toLocaleDateString("ar-SA")
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.user_confirmation === true && (
                      <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                        مؤكد
                      </span>
                    )}
                    {item.user_confirmation === false && (
                      <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                        مرفوض
                      </span>
                    )}
                    {item.user_confirmation === null && (
                      <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full">
                        بانتظار الرد
                      </span>
                    )}
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
  onFontNameChange: (v: string) => void;
  onDownloadUrlChange: (v: string) => void;
  onResolve: () => void;
  resolving: boolean;
  onPreview: () => void;
  isCorrection?: boolean;
}

const QueueCard = ({
  item,
  fontName,
  downloadUrl,
  onFontNameChange,
  onDownloadUrlChange,
  onResolve,
  resolving,
  onPreview,
  isCorrection,
}: QueueCardProps) => (
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
      <img
        src={item.user_uploaded_image}
        alt="صورة المستخدم"
        className="w-20 h-20 rounded-lg object-cover bg-muted cursor-pointer border border-border hover:border-primary/50 transition-colors"
        onClick={onPreview}
      />
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

        <div className="space-y-2">
          <input
            type="text"
            value={fontName}
            onChange={(e) => onFontNameChange(e.target.value)}
            placeholder="اسم الخط المحدد"
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div className="flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="url"
              value={downloadUrl}
              onChange={(e) => onDownloadUrlChange(e.target.value)}
              placeholder="رابط التحميل المباشر (اختياري)"
              dir="ltr"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
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
      </div>
    </div>
  </div>
);

export default AdminQueue;
