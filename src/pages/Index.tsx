import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import UploadZone from "@/components/UploadZone";
import ImageCropper from "@/components/ImageCropper";
import ColorPicker from "@/components/ColorPicker";
import FontCard from "@/components/FontCard";
import ScanProgress from "@/components/ScanProgress";
import WebFontResults from "@/components/WebFontResults";
import { Send, ArrowRight, Bug, Image as ImageIcon, Search, Type } from "lucide-react";
import { toast } from "sonner";
import {
  normalizeImage,
  generatePerceptualHash,
  matchFont,
  hashSimilarity,
} from "@/lib/imageProcessing";
import { searchMultipleFonts, searchFontOnWeb, type WebFontMatch } from "@/lib/webFontSearch";

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

type Step = "home" | "upload" | "crop" | "details" | "results" | "nameSearch";
type ScanStage = "normalizing" | "hashing" | "comparing" | "dataset" | "ai" | "web" | "ranking";

const fileToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const Index = () => {
  const [step, setStep] = useState<Step>("home");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [typedText, setTypedText] = useState("");
  const [textColor, setTextColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [results, setResults] = useState<FontResult[]>([]);
  const [webResults, setWebResults] = useState<WebFontMatch[]>([]);
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

      // Phase 4: Search font_dataset (training data)
      setScanStage("dataset");
      try {
        const { data: datasetFonts } = await supabase
          .from("font_dataset")
          .select("*")
          .eq("verified_by_admin", true);

        if (datasetFonts && datasetFonts.length > 0) {
          for (const ds of datasetFonts) {
            if (!ds.visual_hash && !ds.sample_image_url) continue;

            let similarity = 0;
            if (ds.visual_hash) {
              similarity = hashSimilarity(userHash, ds.visual_hash);
            } else if (ds.sample_image_url) {
              try {
                const { combined } = await matchFont(normalizedUser, userHash, ds.sample_image_url, null);
                similarity = combined;
              } catch { /* skip */ }
            }

            if (similarity > 15) {
              const meta = (ds.metadata_json as any) || {};
              const key = ds.font_name.toLowerCase();
              const existing = visualMatches.find((m) => m.name.toLowerCase() === key);
              if (existing) {
                existing.confidence = Math.max(existing.confidence, similarity);
              } else {
                visualMatches.push({
                  name: ds.font_name,
                  nameAr: ds.font_name,
                  style: meta.category || "عام",
                  confidence: similarity,
                  isPerfectMatch: similarity >= 90,
                  reason: `ارشيف المملكة · بصمة: ${similarity}%`,
                  fileUrl: meta.download_url || null,
                  license: "مجاني",
                  category: meta.category || "modern",
                  previewImageUrl: ds.sample_image_url,
                  fontFiles: [],
                  downloadUrl: meta.download_url || null,
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Dataset search failed:", e);
      }

      // Phase 5: AI matching
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

      // Phase 5: Web search via Puter.js + Perplexity
      setScanStage("web");
      let webMatches: WebFontMatch[] = [];
      try {
        const fontNamesToSearch = [
          ...aiResults.map((r) => r.name),
          ...visualMatches.map((r) => r.name),
        ].filter(Boolean);

        if (fontNamesToSearch.length > 0) {
          webMatches = await searchMultipleFonts(
            [...new Set(fontNamesToSearch)],
            typedText || ""
          );
        }
      } catch (e) {
        console.warn("Web search failed:", e);
      }
      setWebResults(webMatches);

      // Phase 6: Merge & rank
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
        .slice(0, 8)
        .map((r) => ({
          ...r,
          isPerfectMatch: r.confidence >= 90,
          reason: r.confidence >= 90
            ? `تطابق حاسم · ${r.reason || ""}`
            : r.confidence >= 70
            ? `اقتراح قريب · ${r.reason || ""}`
            : r.reason,
        }));

      // Fallback: if best score < 70%, queue for manual review
      const bestScore = finalResults.length > 0 ? finalResults[0].confidence : 0;
      if (bestScore < 70 && croppedBlob) {
        try {
          const imageUrl = await uploadImageForReview(croppedBlob);
          if (imageUrl) {
            let uid = localStorage.getItem("kingdom_user_id");
            if (!uid) {
              uid = crypto.randomUUID();
              localStorage.setItem("kingdom_user_id", uid);
            }
            await supabase.from("manual_identification_queue").insert({
              user_uploaded_image: imageUrl,
              status: "pending",
              user_id: uid,
            } as any);
            toast.info("خطاطو المملكة يحللون هذا الخط النادر... تابع طلبك من صفحة طلباتي", { duration: 5000 });
          }
        } catch (e) {
          console.warn("Failed to queue for manual review:", e);
        }
      }

      if (finalResults.length === 0 && webMatches.length === 0) {
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

  const uploadImageForReview = async (blob: Blob): Promise<string | null> => {
    try {
      const ext = "png";
      const path = `queue/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("fonts").upload(path, blob);
      if (error) throw error;
      const { data } = supabase.storage.from("fonts").getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.warn("Upload for review failed:", e);
      return null;
    }
  };

  const reset = () => {
    setStep("home");
    setUploadedImage(null);
    setCroppedImage(null);
    setCroppedBlob(null);
    setTypedText("");
    setTextColor("#000000");
    setBgColor("#ffffff");
    setResults([]);
    setWebResults([]);
    setErrorMsg(null);
    setNameQuery("");
    setNameResults([]);
    setNameWebResults([]);
  };

  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<FontResult[]>([]);
  const [nameWebResults, setNameWebResults] = useState<WebFontMatch[]>([]);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameStage, setNameStage] = useState<"db" | "web" | "done">("db");

  const handleNameSearch = async () => {
    if (!nameQuery.trim()) return;
    setNameLoading(true);
    setNameResults([]);
    setNameWebResults([]);
    setNameStage("db");

    try {
      // Phase 1: Internal database search
      const { data, error } = await supabase
        .from("fonts_library")
        .select("*");
      if (error) throw new Error(error.message);

      const { data: allFontFiles } = await supabase
        .from("font_files")
        .select("*");

      const fontFilesMap = new Map<string, FontFile[]>();
      if (allFontFiles) {
        for (const ff of allFontFiles) {
          const list = fontFilesMap.get(ff.font_id) || [];
          list.push({ weight: ff.weight, file_url: ff.file_url });
          fontFilesMap.set(ff.font_id, list);
        }
      }

      const q = nameQuery.trim().toLowerCase();
      const matched = (data ?? [])
        .filter((f: any) =>
          f.font_name?.toLowerCase().includes(q) ||
          f.font_name_ar?.includes(nameQuery.trim())
        )
        .map((f: any) => {
          const files = fontFilesMap.get(f.id) || [];
          return {
            name: f.font_name,
            nameAr: f.font_name_ar,
            style: f.style,
            confidence: 100,
            isPerfectMatch: true,
            reason: "مطابقة بالاسم",
            fileUrl: files.length > 0 ? files[0].file_url : f.download_url,
            license: f.license,
            category: f.category,
            previewImageUrl: f.preview_image_url,
            fontFiles: files,
            downloadUrl: f.download_url,
          } as FontResult;
        });

      setNameResults(matched);

      // Phase 2: Web search
      setNameStage("web");
      try {
        const webMatches = await searchFontOnWeb(nameQuery.trim(), "");
        setNameWebResults(webMatches);
      } catch (e) {
        console.warn("Web name search failed:", e);
      }

      setNameStage("done");
      if (matched.length === 0) toast.info("لم يتم العثور على الخط في مكتبتنا، تحقق من نتائج الويب");
    } catch (e) {
      toast.error("حدث خطأ اثناء البحث");
    } finally {
      setNameLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 pb-16 space-y-6">
        {/* Home: Two main buttons */}
        {step === "home" && (
          <div className="opacity-0 animate-scale-in space-y-6 pt-4">
            <p className="text-center text-muted-foreground text-sm">اختر طريقة البحث عن الخط</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setStep("upload")}
                className="font-card flex flex-col items-center gap-3 py-8 px-4 hover:border-primary/40 transition-colors cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-foreground font-medium text-sm">بحث بالصورة</span>
                <span className="text-muted-foreground text-xs text-center">ارفع صورة الخط للتعرف عليه</span>
              </button>
              <button
                onClick={() => setStep("nameSearch")}
                className="font-card flex flex-col items-center gap-3 py-8 px-4 hover:border-primary/40 transition-colors cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Type className="w-6 h-6 text-secondary" />
                </div>
                <span className="text-foreground font-medium text-sm">بحث بالاسم</span>
                <span className="text-muted-foreground text-xs text-center">ابحث عن خط بكتابة اسمه</span>
              </button>
            </div>
          </div>
        )}

        {/* Step indicators (only for image search flow) */}
        {["upload", "crop", "details", "results"].includes(step) && (
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
        )}

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
              <ScanProgress stage={scanStage} />
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

            {/* Web search results */}
            {!isLoading && webResults.length > 0 && (
              <WebFontResults results={webResults} />
            )}

            {!isLoading && results.length === 0 && webResults.length === 0 && !errorMsg && (
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

        {/* Name Search */}
        {step === "nameSearch" && (
          <div className="space-y-6 opacity-0 animate-scale-in">
            <div className="font-card space-y-4">
              <label className="text-sm text-muted-foreground">ابحث عن خط بكتابة اسمه</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSearch()}
                  placeholder="مثال: Cairo أو القاهرة"
                  className="flex-1 bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button
                  onClick={handleNameSearch}
                  disabled={nameLoading || !nameQuery.trim()}
                  className="btn-primary px-4 py-2.5 flex items-center gap-2 text-sm"
                >
                  <Search className="w-4 h-4" />
                  بحث
                </button>
              </div>
            </div>

            {nameLoading && (
              <div className="space-y-3 py-6">
                <div className="flex justify-center">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
                <p className="text-center text-xs text-muted-foreground animate-pulse">
                  {nameStage === "db" ? "بحث في المكتبة الداخلية..." : "بحث عالمي عبر الويب..."}
                </p>
              </div>
            )}

            {!nameLoading && nameResults.length > 0 && (
              <section className="space-y-4 opacity-0 animate-fade-up">
                <h2 className="text-lg font-semibold text-foreground">نتائج من مكتبتنا</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {nameResults.map((font, i) => (
                    <FontCard
                      key={font.name}
                      {...font}
                      uploadedImage={null}
                      typedText={nameQuery}
                      index={i}
                    />
                  ))}
                </div>
              </section>
            )}

            {!nameLoading && nameWebResults.length > 0 && (
              <WebFontResults results={nameWebResults} />
            )}

            {!nameLoading && nameResults.length === 0 && nameWebResults.length === 0 && nameStage === "done" && (
              <div className="text-center py-8 space-y-4 opacity-0 animate-fade-up">
                <p className="text-muted-foreground text-sm">لم يتم العثور على الخط</p>
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

            <button onClick={reset} className="btn-outline w-full flex items-center justify-center gap-2">
              <ArrowRight className="w-4 h-4" />
              العودة للرئيسية
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
