import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import UploadZone from "@/components/UploadZone";
import ImageCropper from "@/components/ImageCropper";
import ColorPicker from "@/components/ColorPicker";
import FontCard from "@/components/FontCard";
import ScanProgress from "@/components/ScanProgress";
import WebFontResults from "@/components/WebFontResults";
import { Send, ArrowRight, Bug } from "lucide-react";
import { toast } from "sonner";
import {
  normalizeImage,
  generatePerceptualHash,
  matchFont,
} from "@/lib/imageProcessing";
import { searchMultipleFonts, type WebFontMatch } from "@/lib/webFontSearch";
import {
  normalizeImage,
  generatePerceptualHash,
  matchFont,
} from "@/lib/imageProcessing";

interface FontFile {
  weight: string;
  file_url: string;
}

interface FontResult {
  name: string;
  nameAr: string;
  style: string;
  confidence: number;
  isPerfectMatch: boolean;
  reason?: string;
  fileUrl?: string | null;
  license?: string | null;
  category?: string;
  previewImageUrl?: string | null;
  fontFiles: FontFile[];
  downloadUrl?: string | null;
}

type Step = "upload" | "crop" | "details" | "results";
type ScanStage = "normalizing" | "hashing" | "comparing" | "ai" | "ranking";

const stageLabels: Record<ScanStage, string> = {
  normalizing: "تحليل الصورة وتحسينها",
  hashing: "انشاء البصمة البصرية",
  comparing: "مقارنة مع قاعدة البيانات",
  ai: "تحليل بالذكاء الاصطناعي",
  ranking: "ترتيب النتائج",
};

const fileToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const Index = () => {
  const [step, setStep] = useState<Step>("upload");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [typedText, setTypedText] = useState("");
  const [textColor, setTextColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [results, setResults] = useState<FontResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scanStage, setScanStage] = useState<ScanStage>("normalizing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
    setStep("crop");
    setResults([]);
    setErrorMsg(null);
  }, []);

  const handleCropComplete = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setCroppedImage(url);
    setCroppedBlob(blob);
    setStep("details");
  }, []);

  const handleIdentify = async () => {
    if (!croppedImage) return;
    setIsLoading(true);
    setErrorMsg(null);
    setStep("results");

    try {
      // Phase 1: Normalize image
      setScanStage("normalizing");
      const normalizedUser = await normalizeImage(croppedImage, textColor, bgColor);

      // Phase 2: Generate perceptual hash
      setScanStage("hashing");
      const userHash = await generatePerceptualHash(croppedImage);

      // Phase 3: Fetch fonts + font_files and run SSIM matching
      setScanStage("comparing");
      const { data: dbFonts, error: dbError } = await supabase
        .from("fonts_library")
        .select("*");
      if (dbError) throw new Error(dbError.message);

      // Fetch all font files
      const { data: allFontFiles } = await supabase
        .from("font_files" as any)
        .select("*") as any;

      const fontFilesMap = new Map<string, FontFile[]>();
      if (allFontFiles) {
        for (const ff of allFontFiles) {
          const list = fontFilesMap.get(ff.font_id) || [];
          list.push({ weight: ff.weight, file_url: ff.file_url });
          fontFilesMap.set(ff.font_id, list);
        }
      }

      const fonts = (dbFonts ?? []) as any[];
      const visualMatches: FontResult[] = [];

      for (const font of fonts) {
        const refUrl = font.reference_image_url || font.preview_image_url;
        if (!refUrl) continue;

        try {
          const { ssim, hash, combined } = await matchFont(
            normalizedUser,
            userHash,
            refUrl,
            font.visual_features_hash
          );

          if (combined > 15) {
            const files = fontFilesMap.get(font.id) || [];
            visualMatches.push({
              name: font.font_name,
              nameAr: font.font_name_ar,
              style: font.style,
              confidence: combined,
              isPerfectMatch: combined >= 95,
              reason: `SSIM: ${ssim}% · بصمة: ${hash}%`,
              fileUrl: files.length > 0 ? files[0].file_url : font.download_url,
              license: font.license,
              category: font.category,
              previewImageUrl: font.preview_image_url,
              fontFiles: files,
              downloadUrl: font.download_url,
            });
          }
        } catch (e) {
          console.warn(`Match failed for ${font.font_name}:`, e);
        }
      }

      // Phase 4: AI matching
      setScanStage("ai");
      let aiResults: FontResult[] = [];
      if (croppedBlob) {
        try {
          const base64 = await fileToBase64(croppedBlob);
          const { data, error } = await supabase.functions.invoke("identify-font", {
            body: { imageBase64: base64, typedText, textColor, bgColor },
          });
          if (!error && data?.fonts) {
            aiResults = (data.fonts as any[]).map((f: any) => ({
              ...f,
              isPerfectMatch: (f.confidence ?? 0) >= 95,
              previewImageUrl: null,
              fontFiles: [],
              downloadUrl: f.fileUrl,
            }));
          }
        } catch (e) {
          console.warn("AI matching failed:", e);
        }
      }

      // Phase 5: Merge & rank
      setScanStage("ranking");
      const merged = new Map<string, FontResult>();

      for (const r of visualMatches) {
        merged.set(r.name.toLowerCase(), r);
      }

      for (const r of aiResults) {
        const key = r.name.toLowerCase();
        const existing = merged.get(key);
        if (existing) {
          const hi = Math.max(existing.confidence, r.confidence);
          const lo = Math.min(existing.confidence, r.confidence);
          existing.confidence = Math.round(hi * 0.6 + lo * 0.4);
          existing.isPerfectMatch = existing.confidence >= 95;
          if (r.reason && !existing.reason?.includes("SSIM")) {
            existing.reason = `${existing.reason} · ${r.reason}`;
          }
        } else {
          merged.set(key, r);
        }
      }

      const finalResults = Array.from(merged.values())
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 8);

      if (finalResults.length === 0) {
        toast.info("لم يتم العثور على الخط في قاعدة البيانات");
      }
      setResults(finalResults);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "حدث خطا غير متوقع";
      toast.error(msg);
      setErrorMsg(msg);
    } finally {
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  const reset = () => {
    setStep("upload");
    setUploadedImage(null);
    setCroppedImage(null);
    setCroppedBlob(null);
    setTypedText("");
    setTextColor("#000000");
    setBgColor("#ffffff");
    setResults([]);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 pb-16 space-y-6">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          {["رفع", "قص", "تفاصيل", "نتائج"].map((label, i) => {
            const steps: Step[] = ["upload", "crop", "details", "results"];
            const isActive = steps.indexOf(step) >= i;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <div className={`w-8 h-px ${isActive ? "bg-primary" : "bg-border"}`} />}
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="opacity-0 animate-scale-in">
            <UploadZone onImageUpload={handleImageUpload} isLoading={false} />
          </div>
        )}

        {/* Step 2: Crop */}
        {step === "crop" && uploadedImage && (
          <div className="opacity-0 animate-scale-in">
            <ImageCropper imageSrc={uploadedImage} onCropComplete={handleCropComplete} />
          </div>
        )}

        {/* Step 3: Details */}
        {step === "details" && (
          <div className="space-y-5 opacity-0 animate-scale-in">
            {croppedImage && (
              <div className="flex justify-center">
                <div className="rounded-xl overflow-hidden border border-border max-w-xs">
                  <img src={croppedImage} alt="الجزء المقصوص" className="w-full h-auto max-h-40 object-contain bg-muted" />
                </div>
              </div>
            )}

            <div className="font-card space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">اكتب النص الظاهر في الصورة</label>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="مثال: مملكة الخطوط"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <ColorPicker label="لون النص" value={textColor} onChange={setTextColor} imageSrc={croppedImage!} />
              <ColorPicker label="لون الخلفية" value={bgColor} onChange={setBgColor} imageSrc={croppedImage!} />
            </div>

            <button onClick={handleIdentify} className="btn-primary w-full flex items-center justify-center gap-2">
              <Bug className="w-4 h-4" />
              اطلق الحشرة
            </button>
          </div>
        )}

        {/* Step 4: Results */}
        {step === "results" && (
          <div className="space-y-6">
            {isLoading && (
              <div className="space-y-3">
                <ScanProgress stage="analyzing" />
                <p className="text-center text-xs text-muted-foreground animate-pulse">
                  {stageLabels[scanStage]}
                </p>
              </div>
            )}

            {!isLoading && errorMsg && (
              <div className="text-center py-4">
                <p className="text-destructive text-sm">{errorMsg}</p>
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <section className="space-y-4 opacity-0 animate-fade-up">
                <h2 className="text-lg font-semibold text-foreground">الخطوط المطابقة</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {results.map((font, i) => (
                    <FontCard
                      key={font.name}
                      {...font}
                      uploadedImage={croppedImage}
                      typedText={typedText}
                      index={i}
                    />
                  ))}
                </div>
              </section>
            )}

            {!isLoading && results.length === 0 && !errorMsg && (
              <div className="text-center py-8 space-y-4 opacity-0 animate-fade-up">
                <p className="text-muted-foreground text-sm">لم يتم العثور على الخط في مكتبتنا</p>
                <a
                  href="https://t.me/fontskingdom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2 text-sm px-6 py-3"
                >
                  <Send className="w-4 h-4" />
                  اطلب الخط عبر تيليجرام
                </a>
              </div>
            )}

            {!isLoading && (
              <button onClick={reset} className="btn-outline w-full flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" />
                بحث جديد
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
