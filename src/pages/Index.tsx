import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import UploadZone from "@/components/UploadZone";
import ImageCropper from "@/components/ImageCropper";
import { Send, ArrowRight, Upload, Scroll, CheckCircle, Crown, Feather, Eye, Search, Users, X, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Step = "home" | "upload" | "crop" | "submitting" | "done";

const Index = () => {
  const [step, setStep] = useState<Step>("home");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Search by name
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Visitor count
  const [visitorCount, setVisitorCount] = useState(0);

  // Track visit & fetch count
  useEffect(() => {
    const trackVisit = async () => {
      let visitorId = localStorage.getItem("kingdom_visitor_id");
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem("kingdom_visitor_id", visitorId);
      }

      // Record visit
      await supabase.from("site_visits").insert({ visitor_id: visitorId } as any);

      // Get unique visitor count
      const { count } = await supabase
        .from("site_visits")
        .select("visitor_id", { count: "exact", head: true });
      
      setVisitorCount(count ?? 0);
    };
    trackVisit();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast.error("ادخل حرفين على الاقل للبحث");
      return;
    }
    setSearching(true);
    try {
      // Search in fonts_library
      const { data: libraryResults } = await supabase
        .from("fonts_library")
        .select("*")
        .or(`font_name.ilike.%${searchQuery}%,font_name_ar.ilike.%${searchQuery}%`)
        .limit(10);

      // Search in font_dataset
      const { data: datasetResults } = await supabase
        .from("font_dataset")
        .select("*")
        .ilike("font_name", `%${searchQuery}%`)
        .limit(10);

      const combined: any[] = [];

      (libraryResults ?? []).forEach((f) => {
        combined.push({
          id: f.id,
          name: f.font_name,
          nameAr: f.font_name_ar,
          category: f.category,
          downloadUrl: f.download_url,
          previewImage: f.preview_image_url,
          source: "library",
        });
      });

      (datasetResults ?? []).forEach((f) => {
        const meta = f.metadata_json as any;
        combined.push({
          id: f.id,
          name: f.font_name,
          nameAr: f.font_name,
          category: meta?.category ?? "",
          downloadUrl: meta?.download_url ?? null,
          previewImage: f.sample_image_url,
          source: "dataset",
        });
      });

      // Remove duplicates by name
      const unique = combined.filter(
        (v, i, a) => a.findIndex((t) => t.name.toLowerCase() === v.name.toLowerCase()) === i
      );

      setSearchResults(unique);
      if (unique.length === 0) {
        toast("لم يتم العثور على نتائج لـ \"" + searchQuery + "\"");
      }
    } catch (e) {
      console.error(e);
      toast.error("حدث خطا اثناء البحث");
    } finally {
      setSearching(false);
    }
  };

  const handleImageUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
    setStep("crop");
  }, []);

  const handleCropComplete = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setCroppedImage(url);
    setCroppedBlob(blob);
  }, []);

  const uploadImageForReview = async (blob: Blob): Promise<string | null> => {
    try {
      const path = `queue/${crypto.randomUUID()}.png`;
      const { error } = await supabase.storage.from("fonts").upload(path, blob);
      if (error) throw error;
      const { data } = supabase.storage.from("fonts").getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.warn("Upload failed:", e);
      return null;
    }
  };

  const handleSubmitRequest = async () => {
    if (!croppedBlob) return;
    setIsLoading(true);
    setStep("submitting");

    try {
      const imageUrl = await uploadImageForReview(croppedBlob);
      if (!imageUrl) throw new Error("فشل رفع الصورة");

      let uid = localStorage.getItem("kingdom_user_id");
      if (!uid) {
        uid = crypto.randomUUID();
        localStorage.setItem("kingdom_user_id", uid);
      }

      const { error } = await supabase.from("manual_identification_queue").insert({
        user_uploaded_image: imageUrl,
        status: "pending",
        user_id: uid,
      } as any);

      if (error) throw error;

      setStep("done");
      toast.success("تم ارسال طلبك بنجاح! سيتم اشعارك عند التعرف على الخط");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "حدث خطا غير متوقع");
      setStep("crop");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStep("home");
    setUploadedImage(null);
    setCroppedImage(null);
    setCroppedBlob(null);
  };

  return (
    <div className="min-h-screen">

      <main className="container max-w-2xl mx-auto px-4 pb-16 space-y-6">
        {/* Home */}
        {step === "home" && (
          <div className="space-y-6 pt-6">
            {/* Hero Section */}
            <div className="text-center space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2 animate-scale-in">
                <Crown className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-foreground font-bold text-2xl leading-tight">
                مملكة الخطوط
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                لا تعرف اسم الخط؟ ارفع صورته وسيتولى المشرفون التعرف عليه وارسال النتيجة اليك
              </p>
            </div>

            {/* Visitor Counter */}
            <div className="flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/30 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>{visitorCount.toLocaleString("ar-SA")} زائر</span>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
              {[
                { icon: Upload, label: "ارفع صورة" },
                { icon: Eye, label: "نحلل الخط" },
                { icon: Feather, label: "نرسل النتيجة" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-card border border-border/30">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
              <button
                onClick={() => setStep("upload")}
                className="btn-primary-interactive w-full flex items-center justify-center gap-3 py-4 text-base font-bold rounded-xl"
              >
                <Upload className="w-5 h-5" />
                ارسال طلب تعرف على خط
              </button>

              <button
                onClick={() => setShowSearch(!showSearch)}
                className="btn-outline-interactive w-full flex items-center justify-center gap-3 py-3 text-sm font-medium rounded-xl"
              >
                <Search className="w-4 h-4" />
                البحث عن خط بالاسم
              </button>
            </div>

            {/* Search Section */}
            {showSearch && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="ادخل اسم الخط..."
                    className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="btn-primary-interactive px-4 py-2.5 rounded-xl flex items-center gap-2"
                  >
                    {searching ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{searchResults.length} نتيجة</p>
                      <button onClick={() => { setSearchResults([]); setSearchQuery(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {searchResults.map((font) => (
                      <div key={font.id} className="flex items-center gap-3 bg-card border border-border/50 rounded-xl px-4 py-3">
                        {font.previewImage && (
                          <img src={font.previewImage} alt={font.name} className="w-10 h-10 rounded-lg object-cover bg-muted shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium text-sm truncate">{font.name}</p>
                          {font.nameAr !== font.name && (
                            <p className="text-muted-foreground text-xs truncate">{font.nameAr}</p>
                          )}
                          {font.category && (
                            <span className="text-[10px] text-muted-foreground/70">{font.category}</span>
                          )}
                        </div>
                        {font.downloadUrl && (
                          <a
                            href={font.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Requests Link */}
            <div className="animate-fade-in" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
              <Link
                to="/my-requests"
                className="flex items-center justify-center gap-2 text-muted-foreground text-xs hover:text-primary transition-colors py-2"
              >
                <Scroll className="w-3.5 h-3.5" />
                تتبع طلباتي السابقة
              </Link>
            </div>
          </div>
        )}

        {/* Step indicators */}
        {["upload", "crop"].includes(step) && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground animate-fade-in">
            {["رفع", "قص", "ارسال"].map((label, i) => {
              const steps = ["upload", "crop", "submitting"];
              const currentIdx = step === "crop" && croppedBlob ? 2 : steps.indexOf(step);
              const isActive = currentIdx >= i;
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-8 h-px transition-colors duration-300 ${isActive ? "bg-primary" : "bg-border"}`} />}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300 ${
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
          <div className="animate-fade-in">
            <UploadZone onImageUpload={handleImageUpload} isLoading={false} />
          </div>
        )}

        {/* Step 2: Crop */}
        {step === "crop" && uploadedImage && (
          <div className="animate-fade-in space-y-4">
            <ImageCropper imageSrc={uploadedImage} onCropComplete={handleCropComplete} />

            {croppedImage && (
              <div className="space-y-4 animate-scale-in">
                <div className="flex justify-center">
                  <div className="rounded-xl overflow-hidden border border-border max-w-xs">
                    <img
                      src={croppedImage}
                      alt="الجزء المقصوص"
                      className="w-full h-auto max-h-40 object-contain bg-muted"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmitRequest}
                  disabled={isLoading}
                  className="btn-primary-interactive w-full flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  ارسال للتعرف اليدوي
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submitting */}
        {step === "submitting" && (
          <div className="flex flex-col items-center gap-4 py-12 animate-fade-in">
            <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-foreground font-medium text-sm">جاري ارسال طلبك للمشرفين...</p>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 animate-scale-in">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-foreground font-bold text-lg">تم ارسال طلبك بنجاح</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                سيقوم المشرفون بالتعرف على الخط واشعارك بالنتيجة. يمكنك متابعة حالة طلبك من صفحة طلباتي.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to="/my-requests"
                className="btn-primary-interactive w-full flex items-center justify-center gap-2"
              >
                <Scroll className="w-4 h-4" />
                تتبع طلباتي
              </Link>
              <button
                onClick={reset}
                className="btn-outline-interactive w-full flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                ارسال طلب جديد
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
