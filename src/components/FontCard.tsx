import { Download, Type, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FontCardProps {
  name: string;
  nameAr: string;
  style: string;
  confidence: number;
  reason?: string;
  fileUrl?: string | null;
  license?: string | null;
  previewImage?: string | null;
  index: number;
}

const FontCard = ({ name, nameAr, style, confidence, reason, fileUrl, license, previewImage, index }: FontCardProps) => {
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
      <div className="bg-muted rounded-lg mb-5 overflow-hidden">
        {previewImage ? (
          <img
            src={previewImage}
            alt={`معاينة خط ${nameAr}`}
            className="w-full h-40 object-contain bg-white"
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

      <div className="space-y-3">
        <div>
          <h3 className="text-foreground font-semibold text-lg">{nameAr}</h3>
          <p className="text-muted-foreground text-sm">{name} · {style}</p>
        </div>

        {license && (
          <p className="text-muted-foreground text-xs">الترخيص: {license}</p>
        )}

        {reason && (
          <p className="text-muted-foreground text-xs leading-relaxed">{reason}</p>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-olive rounded-full transition-all duration-700"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{confidence}%</span>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleDownload}
            disabled={!fileUrl}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            تحميل
          </button>
          <button
            onClick={handleTry}
            disabled={!fileUrl}
            className="btn-outline flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink className="w-4 h-4" />
            تجربة
          </button>
        </div>
      </div>
    </div>
  );
};

export default FontCard;
