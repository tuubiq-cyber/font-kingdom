import { useState } from "react";
import Header from "@/components/Header";
import UploadZone from "@/components/UploadZone";
import FontCard from "@/components/FontCard";

interface FontResult {
  name: string;
  nameAr: string;
  style: string;
  confidence: number;
}

// Mock results for demo
const mockResults: FontResult[] = [
  { name: "Adobe Arabic", nameAr: "ادوبي عربي", style: "Bold", confidence: 94 },
  { name: "Droid Arabic Naskh", nameAr: "درويد نسخ", style: "Regular", confidence: 87 },
  { name: "Tajawal", nameAr: "تجول", style: "Medium", confidence: 72 },
];

const Index = () => {
  const [results, setResults] = useState<FontResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = (file: File) => {
    setIsLoading(true);
    setResults([]);
    setUploadedImage(URL.createObjectURL(file));

    // Simulate AI analysis
    setTimeout(() => {
      setResults(mockResults);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container max-w-4xl mx-auto px-4 pb-16 space-y-10">
        <UploadZone onImageUpload={handleImageUpload} isLoading={isLoading} />

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
