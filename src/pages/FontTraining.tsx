import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, ArrowRight, LogOut, Brain, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { generatePerceptualHash } from "@/lib/imageProcessing";

const FontTraining = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [fontName, setFontName] = useState("");
  const [category, setCategory] = useState("modern");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { value: "naskh", label: "نسخ" },
    { value: "kufi", label: "كوفي" },
    { value: "thuluth", label: "ثلث" },
    { value: "diwani", label: "ديواني" },
    { value: "ruqah", label: "رقعة" },
    { value: "nastaliq", label: "نستعليق" },
    { value: "modern", label: "حديث" },
    { value: "display", label: "عرض" },
  ];

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchDatasets = async () => {
    const { data, error } = await supabase
      .from("font_dataset")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setDatasets(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchDatasets();
  }, [user]);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("fonts").upload(path, file);
    if (error) throw error;
    const { data: signedData, error: signError } = await supabase.storage.from("fonts").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signError || !signedData?.signedUrl) throw signError || new Error("Signed URL failed");
    return signedData.signedUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fontName || !sampleFile) {
      toast.error("يرجى ادخال اسم الخط ورفع صورة العينة");
      return;
    }
    setSubmitting(true);

    try {
      const sampleUrl = await uploadFile(sampleFile, "dataset");

      let visualHash: string | null = null;
      try {
        visualHash = await generatePerceptualHash(sampleUrl);
      } catch (e) {
        console.warn("Hash generation failed:", e);
      }

      const metadata = {
        category,
        download_url: downloadUrl || null,
      };

      const { error } = await supabase.from("font_dataset").insert({
        font_name: fontName,
        sample_image_url: sampleUrl,
        metadata_json: metadata,
        visual_hash: visualHash,
        verified_by_admin: true,
      } as any);

      if (error) throw error;

      toast.success("تم حفظ العينة في مجموعة التدريب");
      setFontName("");
      setCategory("modern");
      setDownloadUrl("");
      setSampleFile(null);
      fetchDatasets();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطا اثناء الحفظ");
    } finally {
      setSubmitting(false);
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

  return (
    <div className="min-h-screen">
      <header className="py-6 border-b border-border">
        <div className="container max-w-3xl mx-auto px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            تدريب محرك الخطوط
          </h1>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="btn-outline flex items-center gap-2 text-sm px-4 py-2">
              <ArrowRight className="w-4 h-4" />
              ادارة المكتبة
            </Link>
            <Link to="/admin/queue" className="btn-outline flex items-center gap-2 text-sm px-4 py-2">
              طابور المراجعة
            </Link>
            <Link to="/admin/brain" className="btn-outline flex items-center gap-2 text-sm px-4 py-2">
              <Brain className="w-4 h-4" />
              عقل النموذج
            </Link>
            <button onClick={signOut} className="btn-outline flex items-center gap-2 text-sm px-4 py-2 text-destructive">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-8">
        <form onSubmit={handleSubmit} className="font-card space-y-4">
          <h2 className="text-foreground font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            اضافة عينة تدريب جديدة
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">اسم الخط</label>
              <input
                type="text"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                placeholder="مثال: Cairo"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">التصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">رابط التحميل (اختياري)</label>
            <input
              type="url"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://fonts.google.com/..."
              dir="ltr"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">صورة عينة الخط</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSampleFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted-foreground file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-medium file:cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground/60">ارفع صورة واضحة تحتوي على نص مكتوب بهذا الخط</p>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Brain className="w-4 h-4" />
                حفظ في مجموعة التدريب
              </>
            )}
          </button>
        </form>

        <section className="space-y-3">
          <h2 className="text-foreground font-semibold">مجموعة التدريب ({datasets.length})</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : datasets.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">لم تتم اضافة اي عينات بعد</p>
          ) : (
            <div className="space-y-2">
              {datasets.map((ds) => (
                <div key={ds.id} className="flex items-center gap-3 bg-card border border-border/50 rounded-lg px-4 py-3">
                  <img src={ds.sample_image_url} alt={ds.font_name} className="w-12 h-12 rounded object-cover bg-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">{ds.font_name}</p>
                    <p className="text-muted-foreground text-xs">
                      {ds.visual_hash ? "بصمة بصرية متوفرة" : "بدون بصمة"} · {ds.verified_by_admin ? "موثق" : "غير موثق"}
                    </p>
                  </div>
                  {ds.verified_by_admin && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default FontTraining;
