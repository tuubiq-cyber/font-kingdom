import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, LogOut, CheckCircle, Clock, Eye, Brain } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { generatePerceptualHash } from "@/lib/imageProcessing";

interface QueueItem {
  id: string;
  user_uploaded_image: string;
  status: string;
  assigned_font_name: string | null;
  created_at: string;
  resolved_at: string | null;
}

const AdminQueue = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [fontNameInput, setFontNameInput] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchQueue = async () => {
    const { data, error } = await supabase
      .from("manual_identification_queue")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setItems((data as unknown as QueueItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchQueue();
  }, [user]);

  const handleResolve = async (item: QueueItem) => {
    const name = fontNameInput[item.id]?.trim();
    if (!name) {
      toast.error("يرجى ادخال اسم الخط");
      return;
    }

    setResolvingId(item.id);
    try {
      // Update queue status
      const { error: updateError } = await supabase
        .from("manual_identification_queue")
        .update({
          status: "resolved",
          assigned_font_name: name,
          resolved_by: user!.id,
          resolved_at: new Date().toISOString(),
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
        metadata_json: { source: "manual_review" },
        visual_hash: visualHash,
        verified_by_admin: true,
      } as any);

      toast.success("تم حل الطلب واضافة العينة لمجموعة التدريب");
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
            <Link to="/admin" className="btn-outline flex items-center gap-2 text-sm px-4 py-2">
              <ArrowRight className="w-4 h-4" />
              ادارة المكتبة
            </Link>
            <Link to="/train" className="btn-outline flex items-center gap-2 text-sm px-4 py-2">
              <Brain className="w-4 h-4" />
              التدريب
            </Link>
            <button onClick={signOut} className="btn-outline flex items-center gap-2 text-sm px-4 py-2 text-destructive">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Pending */}
        <section className="space-y-4">
          <h2 className="text-foreground font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            طلبات معلقة ({pending.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-8 font-card">
              <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">لا توجد طلبات معلقة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((item) => (
                <div key={item.id} className="font-card space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={item.user_uploaded_image}
                      alt="صورة المستخدم"
                      className="w-20 h-20 rounded-lg object-cover bg-muted cursor-pointer border border-border hover:border-primary/50 transition-colors"
                      onClick={() => setPreviewImage(item.user_uploaded_image)}
                    />
                    <div className="flex-1 space-y-2">
                      <p className="text-muted-foreground text-xs">
                        {new Date(item.created_at).toLocaleDateString("ar-SA")} · {new Date(item.created_at).toLocaleTimeString("ar-SA")}
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={fontNameInput[item.id] || ""}
                          onChange={(e) => setFontNameInput((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="ادخل اسم الخط"
                          className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <button
                          onClick={() => handleResolve(item)}
                          disabled={resolvingId === item.id}
                          className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5"
                        >
                          {resolvingId === item.id ? (
                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              حل
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد طلبات محلولة بعد</p>
          ) : (
            <div className="space-y-2">
              {resolved.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-card border border-border/50 rounded-lg px-4 py-3">
                  <img src={item.user_uploaded_image} alt="" className="w-10 h-10 rounded object-cover bg-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">{item.assigned_font_name ?? "غير محدد"}</p>
                    <p className="text-muted-foreground text-xs">
                      تم الحل {item.resolved_at ? new Date(item.resolved_at).toLocaleDateString("ar-SA") : ""}
                    </p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">محلول</span>
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
          <img src={previewImage} alt="معاينة" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default AdminQueue;
