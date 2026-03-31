import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import UploadZone from "@/components/UploadZone";
import UsageCounter from "@/components/UsageCounter";
import ImageCropper from "@/components/ImageCropper";
import { Send, ArrowRight, Upload, Scroll, CheckCircle, Crown, Feather, Eye, Search, Users, X, Type } from "lucide-react";
import { toast } from "sonner";
import { sanitizeText } from "@/lib/sanitize";
import { useAuth } from "@/hooks/useAuth";
import { useDailyLimit } from "@/hooks/useDailyLimit";
import { useTranslation } from "react-i18next";

type Step = "home" | "upload" | "crop" | "submitting" | "done" | "name-sent";

const FloatingParticles = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-primary/5"
        style={{
          width: `${20 + i * 15}px`,
          height: `${20 + i * 15}px`,
          left: `${10 + i * 15}%`,
          top: `${15 + (i % 3) * 25}%`,
          animation: `float-particle ${6 + i * 2}s ease-in-out infinite alternate`,
          animationDelay: `${i * 0.8}s`,
        }}
      />
    ))}
  </div>
);

const PulsingRings = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full border border-primary/10"
        style={{
          width: `${120 + i * 80}px`,
          height: `${120 + i * 80}px`,
          animation: `pulse-ring ${4 + i}s ease-in-out infinite`,
          animationDelay: `${i * 1.2}s`,
        }}
      />
    ))}
  </div>
);

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkAndConsume } = useDailyLimit();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("home");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Search by name (submits to queue)
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [submittingName, setSubmittingName] = useState(false);

  // Visitor count
  const [visitorCount, setVisitorCount] = useState(0);

  const requireAuth = () => {
    if (!user?.id) {
      toast.error(t("mustLoginFirst"));
      navigate("/login");
      return null;
    }
    return user.id;
  };

  useEffect(() => {
    const trackVisit = async () => {
      let visitorId = localStorage.getItem("kingdom_visitor_id");
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem("kingdom_visitor_id", visitorId);
      }
      await supabase.from("site_visits").insert({ visitor_id: visitorId } as any);
      const { count } = await supabase
        .from("site_visits")
        .select("visitor_id", { count: "exact", head: true });
      setVisitorCount(count ?? 0);
    };
    trackVisit();
  }, []);

  const handleNameSearch = async () => {
    const cleaned = sanitizeText(searchQuery);
    if (!cleaned || cleaned.length < 2) {
      toast.error(t("enterTwoChars"));
      return;
    }
    setSubmittingName(true);
    try {
      const uid = requireAuth();
      if (!uid) return;

      const allowed = await checkAndConsume(uid, "name_search");
      if (!allowed) return;

      const { error } = await supabase.from("manual_identification_queue").insert({
        user_uploaded_image: "text_query",
        status: "pending",
        user_id: uid,
        query_text: cleaned,
        is_notified: false,
        needs_correction: false,
      } as any);

      if (error) throw error;
      setStep("name-sent");
      setSearchQuery("");
      toast.success(t("querySentSuccess"));
    } catch (e) {
      console.error(e);
      toast.error(t("sendError"));
    } finally {
      setSubmittingName(false);
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
      const uid = requireAuth();
      if (!uid) { setStep("crop"); setIsLoading(false); return; }

      const allowed = await checkAndConsume(uid, "image_identification");
      if (!allowed) { setStep("crop"); setIsLoading(false); return; }

      const imageUrl = await uploadImageForReview(croppedBlob);
      if (!imageUrl) throw new Error(t("uploadFailed"));

      const { error } = await supabase.from("manual_identification_queue").insert({
        user_uploaded_image: imageUrl,
        status: "pending",
        user_id: uid,
        is_notified: false,
        needs_correction: false,
      } as any);

      if (error) throw error;
      setStep("done");
      toast.success(t("requestSentSuccess"));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t("unexpectedError"));
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
    setShowSearch(false);
  };

  return (
    <div className="min-h-screen relative">
      <FloatingParticles />

      <main className="container max-w-2xl mx-auto px-4 pb-16 space-y-6 relative z-10">
        {/* Home */}
        {step === "home" && (
          <div className="space-y-6 pt-6">
            {/* Hero Section */}
            <div className="text-center space-y-4 animate-fade-in relative">
              <PulsingRings />
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2 animate-scale-in relative z-10 hero-icon-glow">
                <Crown className="w-10 h-10 text-primary animate-gentle-float" />
              </div>
              <h1 className="text-foreground font-bold text-2xl leading-tight relative z-10">
                {t("appName")}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto relative z-10">
                {t("appDesc")}
              </p>
            </div>

            {/* Visitor Counter */}
            <div className="flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/30 text-xs text-muted-foreground visitor-badge">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span><span className="font-serif">{visitorCount.toLocaleString("en-US")}</span> {t("visitors")}</span>
              </div>
            </div>

            {/* Usage Counter */}
            <UsageCounter />

            {/* Features */}
            <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
              {[
                { icon: Upload, label: "ارفع صورة", delay: 0 },
                { icon: Eye, label: "نحلل الخط", delay: 0.1 },
                { icon: Feather, label: "نرسل النتيجة", delay: 0.2 },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-card border border-border/30 feature-card"
                  style={{ animationDelay: `${0.3 + item.delay}s` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center feature-icon">
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
                className="btn-primary-interactive w-full flex items-center justify-center gap-3 py-4 text-base font-bold rounded-xl cta-shimmer"
              >
                <Upload className="w-5 h-5" />
                معرفة الخط بواسطة الصورة
              </button>

              <button
                onClick={() => setShowSearch(!showSearch)}
                className="btn-primary-interactive w-full flex items-center justify-center gap-3 py-4 text-base font-bold rounded-xl cta-shimmer"
              >
                <Search className="w-5 h-5" />
                معرفة الخط بواسطة الاسم
              </button>

              <Link
                to="/my-requests"
                className="btn-primary-interactive w-full flex items-center justify-center gap-3 py-4 text-base font-bold rounded-xl cta-shimmer"
              >
                <Scroll className="w-5 h-5" />
                سجل طلباتي
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
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300 ${isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
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
                    <img src={croppedImage} alt="الجزء المقصوص" className="w-full h-auto max-h-40 object-contain bg-muted" />
                  </div>
                </div>
                <button onClick={handleSubmitRequest} disabled={isLoading} className="btn-primary-interactive w-full flex items-center justify-center gap-2">
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

        {/* Done (image) */}
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
              <Link to="/my-requests" className="btn-primary-interactive w-full flex items-center justify-center gap-2">
                <Scroll className="w-4 h-4" />
                تتبع طلباتي
              </Link>
              <button onClick={reset} className="btn-primary-interactive w-full flex items-center justify-center gap-2 py-3 font-bold rounded-xl cta-shimmer">
                <ArrowRight className="w-4 h-4" />
                ارسال طلب جديد
              </button>
            </div>
          </div>
        )}

        {/* Done (name query) */}
        {step === "name-sent" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 animate-scale-in">
                <Type className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-foreground font-bold text-lg">تم ارسال استفسارك</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                سيقوم المشرفون بالبحث عن الخط المطلوب وارسال الرد اليك
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link to="/my-requests" className="btn-primary-interactive w-full flex items-center justify-center gap-2">
                <Scroll className="w-4 h-4" />
                تتبع طلباتي
              </Link>
              <button onClick={reset} className="btn-primary-interactive w-full flex items-center justify-center gap-2 py-3 font-bold rounded-xl cta-shimmer">
                <ArrowRight className="w-4 h-4" />
                العودة للرئيسية
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
