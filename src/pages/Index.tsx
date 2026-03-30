import { useState } from "react";
import Header from "@/components/Header";
import UploadZone from "@/components/UploadZone";
import SearchBar from "@/components/SearchBar";
import FontCard from "@/components/FontCard";
import { Plus } from "lucide-react";

interface FontResult {
  name: string;
  nameAr: string;
  style: string;
  confidence: number;
}

const mockResults: FontResult[] = [
  { name: "Adobe Arabic", nameAr: "ادوبي عربي", style: "Bold", confidence: 94 },
  { name: "Droid Arabic Naskh", nameAr: "درويد نسخ", style: "Regular", confidence: 87 },
  { name: "Tajawal", nameAr: "تجول", style: "Medium", confidence: 72 },
];

const searchResults: FontResult[] = [
  { name: "Amiri", nameAr: "اميري", style: "Regular", confidence: 100 },
  { name: "Lateef", nameAr: "لطيف", style: "Regular", confidence: 95 },
];

const Index = () => {
  const [results, setResults] = useState<FontResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const handleImageUpload = (file: File) => {
    setIsLoading(true);
    setResults([]);
    setUploadedImage(URL.createObjectURL(file));
    setShowUpload(false);

    setTimeout(() => {
      setResults(mockResults);
      setIsLoading(false);
    }, 2000);
  };

  const handleSearch = (_query: string) => {
    setIsLoading(true);
    setResults([]);
    setUploadedImage(null);

    setTimeout(() => {
      setResults(searchResults);
      setIsLoading(false);
    }, 1000);
  };

  const handleImageSearch = (file: File) => {
    handleImageUpload(file);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container max-w-4xl mx-auto px-4 pb-16 space-y-6">
        {/* Search + Add button row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} onImageSearch={handleImageSearch} />
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={`btn-primary flex items-center gap-2 text-sm px-4 py-2.5 shrink-0 ${showUpload ? "bg-olive/70" : ""}`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">اضافة ملف</span>
          </button>
        </div>

        {/* Upload zone - toggleable */}
        {showUpload && (
          <div className="opacity-0 animate-scale-in">
            <UploadZone onImageUpload={handleImageUpload} isLoading={isLoading} />
          </div>
        )}

        {/* Loading spinner when no upload zone visible */}
        {isLoading && !showUpload && (
          <div className="flex justify-center py-8">
            <div className="w-10 h-10 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
          </div>
        )}

        {uploadedImage && (
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
