import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import UploadZone from "@/components/UploadZone";
import SearchBar from "@/components/SearchBar";
import FontCard from "@/components/FontCard";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface FontResult {
  name: string;
  nameAr: string;
  style: string;
  confidence: number;
  reason?: string;
  fileUrl?: string | null;
  license?: string | null;
  previewImage?: string | null;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Index = () => {
  const [results, setResults] = useState<FontResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const identifyFont = async (file: File) => {
    setIsLoading(true);
    setResults([]);
    setErrorMsg(null);

    const objectUrl = URL.createObjectURL(file);
    setUploadedImage(objectUrl);
    setShowUpload(false);

    try {
      const base64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke("identify-font", {
        body: { imageBase64: base64 },
      });

      if (error) throw new Error(error.message);

      if (data?.error) {
        toast.error(data.error);
        setErrorMsg(data.error);
        return;
      }

      const fonts: FontResult[] = data?.fonts ?? [];

      // Try to match AI results with database fonts for download links
      const { data: dbFonts } = await supabase.from("fonts").select("name, file_url");
      const dbMap = new Map((dbFonts ?? []).map((f) => [f.name.toLowerCase(), f.file_url]));
      const enriched = fonts.map((f) => ({
        ...f,
        fileUrl: dbMap.get(f.name.toLowerCase()) ?? null,
      }));

      if (enriched.length === 0) {
        toast.info("لم يتم العثور على خطوط عربية في الصورة");
      }
      setResults(enriched);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "حدث خطا غير متوقع";
      toast.error(msg);
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (_query: string) => {
    toast.info("البحث بالكلمة المفتاحية قيد التطوير");
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container max-w-4xl mx-auto px-4 pb-16 space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} onImageSearch={identifyFont} />
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={`btn-primary flex items-center gap-2 text-sm px-4 py-2.5 shrink-0 ${showUpload ? "bg-olive/70" : ""}`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">اضافة ملف</span>
          </button>
        </div>

        {showUpload && (
          <div className="opacity-0 animate-scale-in">
            <UploadZone onImageUpload={identifyFont} isLoading={isLoading} />
          </div>
        )}

        {isLoading && !showUpload && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-10 h-10 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">جاري تحليل الصورة بالذكاء الاصطناعي...</p>
          </div>
        )}

        {uploadedImage && !isLoading && (
          <div className="flex justify-center opacity-0 animate-scale-in">
            <div className="rounded-xl overflow-hidden border border-border/50 max-w-sm">
              <img
                src={uploadedImage}
                alt="الصورة المرفوعة"
                className="w-full h-auto max-h-64 object-contain bg-muted"
                loading="lazy"
              />
            </div>
          </div>
        )}

        {errorMsg && !isLoading && (
          <div className="text-center py-4">
            <p className="text-destructive text-sm">{errorMsg}</p>
          </div>
        )}

        {results.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              الخطوط المطابقة
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((font, i) => (
                <FontCard key={font.name} {...font} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Index;
