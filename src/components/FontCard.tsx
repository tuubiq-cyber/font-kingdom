import { useState, useEffect, useRef } from "react";
import { Download, ExternalLink, Crown, FileType, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface FontFile {
  weight: string;
  file_url: string;
}

interface FontCardProps {
  name: string;
  nameAr: string;
  style: string;
  confidence: number;
  isPerfectMatch?: boolean;
  reason?: string;
  fileUrl?: string | null;
  license?: string | null;
  category?: string;
  uploadedImage?: string | null;
  typedText?: string;
  fontFiles?: FontFile[];
  downloadUrl?: string | null;
  index: number;
}

const categoryLabels: Record<string, string> = {
  naskh: "نسخ",
  kufi: "كوفي",
  thuluth: "ثلث",
  diwani: "ديواني",
  ruqah: "رقعة",
  nastaliq: "نستعليق",
  modern: "حديث",
  display: "عرض",
};

const FontCard = ({
  name,
  nameAr,
  style,
  confidence,
  isPerfectMatch,
  reason,
  fileUrl,
  license,
  category,
  uploadedImage,
  typedText,
  fontFiles = [],
  downloadUrl,
  index,
}: FontCardProps) => {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const fontFaceRef = useRef<string | null>(null);

  // Dynamically load font using FontFace API
  useEffect(() => {
    const url = fontFiles.length > 0 ? fontFiles[0].file_url : fileUrl || downloadUrl;
    if (!url) return;

    const fontFamily = `font-preview-${name.replace(/\s+/g, "-")}-${index}`;
    fontFaceRef.current = fontFamily;

    const font = new FontFace(fontFamily, `url(${url})`, {
      style: "normal",
      weight: "400",
    });

    font
      .load()
      .then((loadedFace) => {
        document.fonts.add(loadedFace);
        setFontLoaded(true);
      })
      .catch((e) => {
        console.warn(`Font load failed for ${name}:`, e);
      });

    return () => {
      // Cleanup: remove the font face
      document.fonts.forEach((f) => {
        if (f.family === fontFamily) {
          document.fonts.delete(f);
        }
      });
    };
  }, [name, fileUrl, downloadUrl, fontFiles, index]);

  const handleDownload = (url?: string) => {
    const downloadLink = url || fileUrl || downloadUrl;
    if (downloadLink) {
      const a = document.createElement("a");
      a.href = downloadLink;
      a.download = `${name}.${downloadLink.split(".").pop()}`;
      a.click();
    } else {
      toast.error("ملف الخط غير متوفر حاليا");
    }
  };

  const getFileExt = (url: string) => {
    const ext = url.split(".").pop()?.toUpperCase();
    return ext === "WOFF2" ? "WOFF2" : ext || "TTF";
  };

  const primaryUrl = fontFiles.length > 0 ? fontFiles[0].file_url : fileUrl || downloadUrl;
  const confidenceColor =
    confidence >= 90 ? "bg-green-500" :
    confidence >= 70 ? "bg-olive" :
    confidence >= 40 ? "bg-sand" : "bg-muted-foreground";

  const matchLabel =
    confidence >= 90 ? "تطابق حاسم" :
    confidence >= 70 ? "اقتراح قريب" : null;

  return (
    <div
      className="font-card opacity-0 animate-fade-up relative"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Match type badge */}
      {(isPerfectMatch || matchLabel) && (
        <div className={`absolute -top-2 -right-2 z-10 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg ${
          isPerfectMatch ? "bg-green-500" : "bg-primary"
        }`}>
          <Crown className="w-3 h-3" />
          {isPerfectMatch ? "تطابق حاسم" : matchLabel}
        </div>
      )}

      {/* Dynamic font preview */}
      <div className="bg-muted rounded-lg mb-4 overflow-hidden">
        {fontLoaded && typedText && fontFaceRef.current ? (
          <div className="p-5">
            <p
              className="text-2xl text-foreground text-center leading-relaxed"
              dir="rtl"
              style={{ fontFamily: fontFaceRef.current }}
            >
              {typedText}
            </p>
            <p className="text-[10px] text-muted-foreground text-center mt-2">معاينة حية</p>
          </div>
        ) : uploadedImage ? (
          <img
            src={uploadedImage}
            alt="الصورة المرفوعة"
            className="w-full h-36 object-contain bg-muted"
            loading="lazy"
          />
        ) : (
          <div className="p-6">
            <p className="text-2xl text-foreground text-center leading-relaxed" dir="rtl">
              مملكة الخطوط العربية
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-foreground font-semibold text-base truncate">{nameAr}</h3>
            <p className="text-muted-foreground text-xs">{name} · {style}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {category && categoryLabels[category] && (
              <span className="text-[10px] font-medium bg-olive/15 text-olive px-2 py-0.5 rounded-full">
                {categoryLabels[category]}
              </span>
            )}
            {primaryUrl && (
              <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <FileType className="w-2.5 h-2.5" />
                {getFileExt(primaryUrl)}
              </span>
            )}
          </div>
        </div>

        {license && (
          <p className="text-muted-foreground text-[11px]">
            الترخيص: <span className={license === "مجاني" ? "text-green-600" : "text-sand"}>{license}</span>
          </p>
        )}

        {reason && (
          <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">{reason}</p>
        )}

        {/* Confidence bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${confidenceColor}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className={`text-[10px] font-bold ${confidence >= 95 ? "text-green-600" : "text-muted-foreground"}`}>
            {confidence}%
          </span>
        </div>

        {/* Multiple font files dropdown */}
        {fontFiles.length > 1 && (
          <div className="space-y-1">
            <button
              onClick={() => setShowFiles(!showFiles)}
              className="text-xs text-primary hover:underline flex items-center gap-1 w-full"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${showFiles ? "rotate-180" : ""}`} />
              {fontFiles.length} ملفات متوفرة
            </button>
            {showFiles && (
              <div className="space-y-1 bg-muted/50 rounded-lg p-2">
                {fontFiles.map((ff, i) => (
                  <button
                    key={i}
                    onClick={() => handleDownload(ff.file_url)}
                    className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <span className="text-foreground">{ff.weight}</span>
                    <span className="text-muted-foreground">{getFileExt(ff.file_url)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => handleDownload()}
            disabled={!primaryUrl}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            تحميل
          </button>
          <button
            onClick={() => primaryUrl && window.open(primaryUrl, "_blank")}
            disabled={!primaryUrl}
            className="btn-outline flex-1 flex items-center justify-center gap-1.5 text-xs py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            تجربة
          </button>
        </div>
      </div>
    </div>
  );
};

export default FontCard;
