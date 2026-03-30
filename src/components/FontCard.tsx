import { Download, Type } from "lucide-react";

interface FontCardProps {
  name: string;
  nameAr: string;
  style: string;
  confidence: number;
  index: number;
}

const FontCard = ({ name, nameAr, style, confidence, index }: FontCardProps) => {
  return (
    <div
      className="font-card opacity-0 animate-fade-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Preview area */}
      <div className="bg-muted rounded-lg p-6 mb-5">
        <p className="text-2xl text-foreground text-center leading-relaxed" dir="rtl">
          مملكة الخطوط العربية
        </p>
      </div>

      {/* Font info */}
      <div className="space-y-3">
        <div>
          <h3 className="text-foreground font-semibold text-lg">{nameAr}</h3>
          <p className="text-muted-foreground text-sm">{name} · {style}</p>
        </div>

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
          <button className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            تحميل
          </button>
          <button className="btn-outline flex-1 flex items-center justify-center gap-2 text-sm">
            <Type className="w-4 h-4" />
            تجربة
          </button>
        </div>
      </div>
    </div>
  );
};

export default FontCard;
