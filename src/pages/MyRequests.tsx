import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Download,
  ExternalLink,
  ArrowRight,
  Scroll,
  MessageSquare,
  Send,
  Type,
  XCircle,
  RefreshCw,
  ImagePlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { generatePerceptualHash } from "@/lib/imageProcessing";
import { useAuth } from "@/hooks/useAuth";

interface RequestItem {
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

const MyRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectMessage, setRejectMessage] = useState("");
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);
  const [resubmitNote, setResubmitNote] = useState("");
  const [resubmitImage, setResubmitImage] = useState<File | null>(null);
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
      return;
    }
    // Fallback for anonymous users - use same visitor_id as Index page
    const id = localStorage.getItem("visitor_id");
    if (id) {
      setUserId(id);
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("manual_identification_queue")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error) setRequests((data as unknown as RequestItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) fetchRequests();
  }, [userId]);

  // Polling for updates (secure alternative to Realtime)
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      fetchRequests();
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [userId]);

  const handleConfirm = async (item: RequestItem, confirmed: boolean) => {
    try {
      if (confirmed) {
        // User confirms - close request and add to dataset
        await supabase
          .from("manual_identification_queue")
          .update({ user_confirmation: true } as any)
          .eq("id", item.id);

        // Add to font_dataset for future AI accuracy
        let visualHash: string | null = null;
        try {
          visualHash = await generatePerceptualHash(item.user_uploaded_image);
        } catch { /* skip */ }

        const { data: { session: sess } } = await supabase.auth.getSession();
        await supabase.from("font_dataset").insert({
          font_name: item.assigned_font_name!,
          sample_image_url: item.user_uploaded_image,
          metadata_json: {
            source: "user_confirmed",
          },
          visual_hash: visualHash,
          verified_by_admin: false,
          admin_metadata: {},
          user_id: sess?.user?.id,
        } as any);

        toast.success("شكرا لتأكيدك! تمت اضافة الخط لارشيف المملكة");
      } else {
        // User rejects - send back to admin with correction flag + message
        await supabase
          .from("manual_identification_queue")
          .update({
            user_confirmation: false,
            needs_correction: true,
            status: "pending",
            resolved_at: null,
            assigned_font_name: null,
            admin_download_url: null,
          } as any)
          .eq("id", item.id);

        setRejectingId(null);
        setRejectMessage("");
        toast.info("تم اعادة الطلب للمراجعة مع ملاحظاتك");
      }

      fetchRequests();
    } catch (e) {
      console.error(e);
      toast.error("حدث خطا، يرجى المحاولة مجددا");
    }
  };

  const handleResubmit = async (item: RequestItem) => {
    setResubmitting(true);
    try {
      let imageUrl = item.user_uploaded_image;

      // Upload new image if provided
      if (resubmitImage) {
        const ext = resubmitImage.name.split(".").pop();
        const path = `queue/${Date.now()}_resubmit.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("fonts")
          .upload(path, resubmitImage);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("fonts").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      // Reset the rejected request back to pending
      await supabase
        .from("manual_identification_queue")
        .update({
          status: "pending",
          rejection_reason: null,
          resolved_at: null,
          resolved_by: null,
          assigned_font_name: null,
          assigned_font_id: null,
          admin_download_url: null,
          is_notified: false,
          needs_correction: true,
          user_uploaded_image: imageUrl,
          query_text: resubmitNote.trim() || item.query_text || null,
        } as any)
        .eq("id", item.id);

      setResubmittingId(null);
      setResubmitNote("");
      setResubmitImage(null);
      toast.success("تم إعادة إرسال الطلب للمراجعة");
      fetchRequests();
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ، يرجى المحاولة مجدداً");
    } finally {
      setResubmitting(false);
    }
  };

  const pending = requests.filter(
    (r) => r.status === "pending" || (r.status === "resolved" && r.user_confirmation === null)
  );
  const confirmed = requests.filter((r) => r.user_confirmation === true);
  const rejected = requests.filter((r) => r.user_confirmation === false);
  const adminRejected = requests.filter((r) => r.status === "rejected");

  return (
    <div className="min-h-screen">
      

      <main className="container max-w-2xl mx-auto px-4 pb-16 space-y-8 pt-14">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Scroll className="w-5 h-5 text-primary" />
            طلباتي
          </h1>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
          >
            <ArrowRight className="w-4 h-4" />
            العودة
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Scroll className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">
              لا توجد طلبات بعد
            </p>
            <p className="text-muted-foreground/60 text-xs">
              عند رفع صورة خط لم يتعرف عليه النظام، ستظهر هنا
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending / Awaiting feedback */}
            {pending.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  قيد المراجعة ({pending.length})
                </h2>
                <div className="space-y-3">
                  {pending.map((item) => (
                    <div key={item.id} className="font-card space-y-3">
                      <div className="flex items-start gap-3">
                        {item.query_text ? (
                          <div className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                            <Type className="w-5 h-5 text-muted-foreground" />
                          </div>
                        ) : (
                          <img
                            src={item.user_uploaded_image}
                            alt="الصورة المرفوعة"
                            className="w-16 h-16 rounded-lg object-cover bg-muted border border-border"
                          />
                        )}
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString("ar-SA")}
                          </p>

                          {item.query_text && (
                            <p className="text-foreground text-xs bg-muted/50 rounded px-2 py-1 inline-block">
                              بحث: {item.query_text}
                            </p>
                          )}

                          {item.status === "pending" ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                              <p className="text-foreground text-sm">
                                المشرفون يعملون على تحديد هذا الخط...
                              </p>
                            </div>
                          ) : item.status === "resolved" && item.user_confirmation === null ? (
                            <div className="space-y-3">
                              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                                <p className="text-foreground text-sm font-semibold">
                                  {item.assigned_font_name}
                                </p>
                                {item.admin_download_url && (
                                  <a
                                    href={item.admin_download_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary text-xs flex items-center gap-1 hover:underline"
                                  >
                                    <Download className="w-3 h-3" />
                                    تحميل الخط
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                هل هذا هو الخط الصحيح؟
                              </p>

                              {rejectingId === item.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={rejectMessage}
                                    onChange={(e) => setRejectMessage(e.target.value)}
                                    placeholder="اوصف المشكلة للادارة (مثلا: الخط مختلف، اريد خط اعرض...)"
                                    rows={3}
                                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleConfirm(item, false)}
                                      className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2"
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                      ارسال للادارة
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejectingId(null);
                                        setRejectMessage("");
                                      }}
                                      className="btn-outline flex items-center justify-center gap-1.5 text-xs py-2 px-3"
                                    >
                                      الغاء
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleConfirm(item, true)}
                                    className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    نعم، هذا هو الخط
                                  </button>
                                  <button
                                    onClick={() => setRejectingId(item.id)}
                                    className="btn-outline flex-1 flex items-center justify-center gap-1.5 text-xs py-2"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    لا، ليس هو
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : null}

                          {item.needs_correction && item.status === "pending" && (
                            <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                              تم اعادته للمراجعة
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Confirmed */}
            {confirmed.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  تم التأكيد ({confirmed.length})
                </h2>
                <div className="space-y-2">
                  {confirmed.map((item) => (
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
                          {item.assigned_font_name}
                        </p>
                        <p className="text-muted-foreground text-xs">تم التأكيد</p>
                      </div>
                      {item.admin_download_url && (
                        <a
                          href={item.admin_download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Admin Rejected */}
            {adminRejected.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  طلبات مرفوضة ({adminRejected.length})
                </h2>
                <div className="space-y-2">
                  {adminRejected.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 bg-card border border-destructive/20 rounded-lg px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        {item.query_text ? (
                          <div className="w-10 h-10 rounded bg-muted border border-border flex items-center justify-center shrink-0">
                            <Type className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ) : (
                          <img
                            src={item.user_uploaded_image}
                            alt=""
                            className="w-10 h-10 rounded object-cover bg-muted"
                          />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-destructive font-medium text-sm">مرفوض</p>
                          {item.query_text && (
                            <p className="text-muted-foreground text-xs">بحث: {item.query_text}</p>
                          )}
                          {item.rejection_reason && (
                            <p className="text-muted-foreground text-xs bg-destructive/5 rounded px-2 py-1">
                              السبب: {item.rejection_reason}
                            </p>
                          )}
                          <p className="text-muted-foreground text-[11px]">
                            {new Date(item.resolved_at || item.created_at).toLocaleDateString("ar-SA")}
                          </p>
                        </div>
                      </div>

                      {resubmittingId === item.id ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={resubmitNote}
                            onChange={(e) => setResubmitNote(e.target.value)}
                            placeholder="أضف ملاحظة أو وصف أوضح (اختياري)..."
                            rows={2}
                            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                            dir="rtl"
                          />
                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                            <ImagePlus className="w-4 h-4" />
                            {resubmitImage ? resubmitImage.name : "إرفاق صورة جديدة (اختياري)"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => setResubmitImage(e.target.files?.[0] || null)}
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResubmit(item)}
                              disabled={resubmitting}
                              className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2"
                            >
                              {resubmitting ? (
                                <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              إعادة الإرسال
                            </button>
                            <button
                              onClick={() => {
                                setResubmittingId(null);
                                setResubmitNote("");
                                setResubmitImage(null);
                              }}
                              className="btn-outline flex items-center justify-center gap-1.5 text-xs py-2 px-3"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResubmittingId(item.id)}
                          className="self-start flex items-center gap-1.5 text-xs text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          إعادة إرسال مع تعديلات
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyRequests;
