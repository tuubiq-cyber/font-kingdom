import { Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FontCardProps {
  name: string;
  nameAr: string;
  style: string;
  confidence: number;
  reason?: string;
  fileUrl?: string | null;
  license?: string | null;
  category?: string;
  uploadedImage?: string | null;
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
  reason,
  fileUrl,
  license,
  category,
  uploadedImage,
  index,
}: FontCardProps) => {
  const handleDownload = () => {
    if (fileUrl) {
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = `${name}.${fileUrl.split(".").pop()}`;
      a.click();
    } else {
      toast.error("ملف الخط غير متوفر حاليا");
    }
  };

  const handleTry = () => {
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    } else {
      toast.info("ملف الخط غير متوفر للتجربة");
    }
  };

  return (
    <div
      className="font-card opacity-0 animate-fade-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Show the user's uploaded image */}
      <div className="bg-muted rounded-lg mb-4 overflow-hidden">
        {uploadedImage ? (
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
          {category && categoryLabels[category] && (
            <span className="shrink-0 text-[10px] font-medium bg-olive/15 text-olive px-2 py-0.5 rounded-full">
              {categoryLabels[category]}
            </span>
          )}
        </div>

        {license && (
          <p className="text-muted-foreground text-[11px]">الترخيص: {license}</p>
        )}

        {reason && (
          <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">{reason}</p>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-olive rounded-full transition-all duration-700"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">{confidence}%</span>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleDownload}
            disabled={!fileUrl}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            تحميل
          </button>
          <button
            onClick={handleTry}
            disabled={!fileUrl}
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
