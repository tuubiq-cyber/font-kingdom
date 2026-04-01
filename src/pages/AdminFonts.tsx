import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRight, LogOut, Fingerprint, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { generatePerceptualHash } from "@/lib/imageProcessing";

interface FontRow {
  id: string;
  font_name: string;
  font_name_ar: string;
  category: string;
  style: string;
  license: string | null;
  download_url: string | null;
  preview_image_url: string | null;
  visual_features_hash: string | null;
  reference_image_url: string | null;
  tags: string[] | null;
  created_at: string;
}

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

const AdminFonts = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [fonts, setFonts] = useState<FontRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [fontName, setFontName] = useState("");
  const [fontNameAr, setFontNameAr] = useState("");
  const [category, setCategory] = useState("modern");
  const [style, setStyle] = useState("Regular");
  const [license, setLicense] = useState("مجاني");
  const [tags, setTags] = useState("");
  const [fontFiles, setFontFiles] = useState<{ file: File; weight: string }[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const weights = ["Thin", "ExtraLight", "Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"];


  const fetchFonts = async () => {
    const { data, error } = await supabase
      .from("fonts_library")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("خطا في جلب الخطوط");
    else setFonts((data as unknown as FontRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchFonts();
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
    if (!fontName || !fontNameAr) {
      toast.error("يرجى تعبئة الاسم بالعربي والانجليزي");
      return;
    }
    setSubmitting(true);

    try {
      let previewUrl: string | null = null;
      let referenceUrl: string | null = null;
      if (previewFile) previewUrl = await uploadFile(previewFile, "previews");
      if (referenceFile) referenceUrl = await uploadFile(referenceFile, "references");

      // Auto-generate perceptual hash from reference image
      let visualHash: string | null = null;
      if (referenceUrl) {
        try {
          visualHash = await generatePerceptualHash(referenceUrl);
          toast.info("تم انشاء البصمة البصرية تلقائيا");
        } catch (e) {
          console.warn("Failed to generate hash:", e);
        }
      }

      const tagsArr = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { data: fontData, error } = await supabase.from("fonts_library").insert({
        font_name: fontName,
        font_name_ar: fontNameAr,
        category,
        style,
        license,
        download_url: null,
        preview_image_url: previewUrl,
        reference_image_url: referenceUrl,
        visual_features_hash: visualHash,
        tags: tagsArr.length > 0 ? tagsArr : null,
      } as any).select("id").single();

      if (error) throw error;

      // Upload each font file with its weight
      for (const ff of fontFiles) {
        const fileUrl = await uploadFile(ff.file, "files");
        await supabase.from("font_files" as any).insert({
          font_id: fontData.id,
          weight: ff.weight,
          file_url: fileUrl,
        } as any);
      }

      if (error) throw error;

      toast.success("تم اضافة الخط بنجاح");
      setFontName("");
      setFontNameAr("");
      setCategory("modern");
      setStyle("Regular");
      setLicense("مجاني");
      setTags("");
      setFontFiles([]);
      setPreviewFile(null);
      setReferenceFile(null);
      setPreviewFile(null);
      fetchFonts();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطا اثناء اضافة الخط");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("fonts_library").delete().eq("id", id);
    if (error) toast.error("خطا في حذف الخط");
    else {
      toast.success("تم حذف الخط");
      setFonts((prev) => prev.filter((f) => f.id !== id));
    }
  };

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
          <h1 className="text-xl font-bold text-foreground">ادارة مكتبة الخطوط</h1>
          <div className="flex items-center gap-2">
            <Link to="/admin/stats" className="btn-outline flex items-center gap-2 text-sm px-3 py-2">
              <BarChart3 className="w-4 h-4" />
              إحصائيات
            </Link>
            <Link to="/" className="btn-outline flex items-center gap-2 text-sm px-4 py-2">
              <ArrowRight className="w-4 h-4" />
              الرئيسية
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
            اضافة خط جديد
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">الاسم بالانجليزي</label>
              <input
                type="text"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                placeholder="e.g. Amiri"
                dir="ltr"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">الاسم بالعربي</label>
              <input
                type="text"
                value={fontNameAr}
                onChange={(e) => setFontNameAr(e.target.value)}
                placeholder="مثال: اميري"
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
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">النوع</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option>Regular</option>
                <option>Bold</option>
                <option>Light</option>
                <option>Medium</option>
                <option>Italic</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">الترخيص</label>
              <input
                type="text"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                placeholder="مجاني / تجاري / SIL"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">الوسوم (مفصولة بفاصلة)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="خط يدوي, ديكوري, عناوين"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Font files with weights */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">ملفات الخط (TTF, OTF, WOFF)</label>
              <button
                type="button"
                onClick={() => setFontFiles([...fontFiles, { file: null as any, weight: "Regular" }])}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                اضافة ملف
              </button>
            </div>
            {fontFiles.map((ff, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={ff.weight}
                  onChange={(e) => {
                    const updated = [...fontFiles];
                    updated[idx] = { ...updated[idx], weight: e.target.value };
                    setFontFiles(updated);
                  }}
                  className="bg-muted border border-border rounded-lg px-2 py-2 text-sm text-foreground w-28 focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  {weights.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const updated = [...fontFiles];
                      updated[idx] = { ...updated[idx], file };
                      setFontFiles(updated);
                    }
                  }}
                  className="flex-1 text-sm text-muted-foreground file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-medium file:cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setFontFiles(fontFiles.filter((_, i) => i !== idx))}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {fontFiles.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center py-2">اضغط "اضافة ملف" لرفع اوزان الخط</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">صورة معاينة</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPreviewFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted-foreground file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-medium file:cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">صورة مرجعية للمطابقة (كلمة "مملكة" او "الخط" بهذا الخط)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted-foreground file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-medium file:cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground/60">ارفع صورة نص مكتوب بهذا الخط لتحسين دقة المطابقة البصرية</p>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                اضافة الخط
              </>
            )}
          </button>
        </form>

        <section className="space-y-3">
          <h2 className="text-foreground font-semibold">الخطوط المسجلة ({fonts.length})</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : fonts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">لم تتم اضافة اي خطوط بعد</p>
          ) : (
            <div className="space-y-2">
              {fonts.map((font) => (
                <div key={font.id} className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {font.preview_image_url && (
                      <img src={font.preview_image_url} alt={font.font_name_ar} className="w-10 h-10 rounded object-cover bg-muted" />
                    )}
                    <div className="min-w-0">
                      <p className="text-foreground font-medium text-sm truncate">
                        {font.font_name_ar} — {font.font_name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {categories.find((c) => c.value === font.category)?.label ?? font.category} · {font.style} · {font.license ?? "—"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(font.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminFonts;
