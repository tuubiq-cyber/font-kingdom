import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface FontRow {
  id: string;
  name: string;
  name_ar: string;
  style: string;
  license: string | null;
  file_url: string | null;
  preview_image_url: string | null;
  created_at: string;
}

const AdminFonts = () => {
  const [fonts, setFonts] = useState<FontRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [style, setStyle] = useState("Regular");
  const [license, setLicense] = useState("مجاني");
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchFonts = async () => {
    const { data, error } = await supabase
      .from("fonts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("خطا في جلب الخطوط");
    } else {
      setFonts(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFonts();
  }, []);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("fonts").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("fonts").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nameAr) {
      toast.error("يرجى تعبئة الاسم بالعربي والانجليزي");
      return;
    }
    setSubmitting(true);

    try {
      let fileUrl: string | null = null;
      let previewUrl: string | null = null;

      if (fontFile) {
        fileUrl = await uploadFile(fontFile, "files");
      }
      if (previewFile) {
        previewUrl = await uploadFile(previewFile, "previews");
      }

      const { error } = await supabase.from("fonts").insert({
        name,
        name_ar: nameAr,
        style,
        license,
        file_url: fileUrl,
        preview_image_url: previewUrl,
      });

      if (error) throw error;

      toast.success("تم اضافة الخط بنجاح");
      setName("");
      setNameAr("");
      setStyle("Regular");
      setLicense("مجاني");
      setFontFile(null);
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
    const { error } = await supabase.from("fonts").delete().eq("id", id);
    if (error) {
      toast.error("خطا في حذف الخط");
    } else {
      toast.success("تم حذف الخط");
      setFonts((prev) => prev.filter((f) => f.id !== id));
    }
  };

  return (
    <div className="min-h-screen">
      <header className="py-6 border-b border-border">
        <div className="container max-w-3xl mx-auto px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">ادارة الخطوط</h1>
          <Link to="/" className="btn-outline flex items-center gap-2 text-sm px-4 py-2">
            <ArrowRight className="w-4 h-4" />
            الرئيسية
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Add Font Form */}
        <form onSubmit={handleSubmit} className="font-card space-y-4">
          <h2 className="text-foreground font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-olive" />
            اضافة خط جديد
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">الاسم بالانجليزي</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amiri"
                dir="ltr"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-olive/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">الاسم بالعربي</label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: اميري"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-olive/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">النوع</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-olive/50"
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
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-olive/50"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">ملف الخط (TTF, OTF, WOFF)</label>
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={(e) => setFontFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-olive file:text-teal-deep file:text-sm file:font-medium file:cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">صورة معاينة (اختياري)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPreviewFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-olive file:text-teal-deep file:text-sm file:font-medium file:cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-teal-deep/30 border-t-teal-deep rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                اضافة الخط
              </>
            )}
          </button>
        </form>

        {/* Fonts List */}
        <section className="space-y-3">
          <h2 className="text-foreground font-semibold">
            الخطوط المسجلة ({fonts.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
            </div>
          ) : fonts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              لم تتم اضافة اي خطوط بعد
            </p>
          ) : (
            <div className="space-y-2">
              {fonts.map((font) => (
                <div
                  key={font.id}
                  className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">
                      {font.name_ar} — {font.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {font.style} · {font.license ?? "—"}
                      {font.file_url && " · ملف مرفق"}
                    </p>
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
