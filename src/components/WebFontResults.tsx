import { Download, ExternalLink, Globe, FileType, Shield } from "lucide-react";
import type { WebFontMatch } from "@/lib/webFontSearch";

interface WebFontResultsProps {
  results: WebFontMatch[];
}

const platformColors: Record<string, string> = {
  "Google Fonts": "bg-blue-500/15 text-blue-400",
  "DaFont": "bg-orange-500/15 text-orange-400",
  "Font Squirrel": "bg-green-500/15 text-green-400",
  "ArabFonts": "bg-purple-500/15 text-purple-400",
  "Fontspace": "bg-pink-500/15 text-pink-400",
  "1001fonts": "bg-yellow-500/15 text-yellow-400",
  "FontFace": "bg-cyan-500/15 text-cyan-400",
  "Arfonts": "bg-red-500/15 text-red-400",
  "Behance": "bg-indigo-500/15 text-indigo-400",
};

const WebFontResults = ({ results }: WebFontResultsProps) => {
  if (results.length === 0) return null;

  return (
    <section className="space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">نتائج البحث العالمي</h2>
      </div>

      <div className="grid gap-3">
        {results.map((font, i) => {
          const colorClass = platformColors[font.source] || "bg-primary/15 text-primary";
          const link = font.downloadUrl || font.sourceUrl;

          return (
            <div
              key={`${font.name}-${font.source}-${i}`}
              className="font-card opacity-0 animate-fade-up"
              style={{ animationDelay: `${(i + 1) * 80}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground font-semibold text-sm truncate">
                      {font.nameAr || font.name}
                    </h3>
                    {font.isExactMatch && (
                      <span className="text-[9px] font-medium bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        تطابق تام
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5">{font.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${font.confidence}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{font.confidence}%</span>
                </div>
              </div>

              {/* Description */}
              {font.description && (
                <p className="text-muted-foreground text-[11px] mt-2 leading-relaxed line-clamp-2">
                  {font.description}
                </p>
              )}

              {/* Meta badges */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {font.format && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    <FileType className="w-3 h-3" />
                    {font.format}
                  </span>
                )}
                {font.license && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    <Shield className="w-3 h-3" />
                    {font.license === "free" ? "مجاني" : font.license}
                  </span>
                )}
              </div>

              {/* Download button + source */}
              {link && (
                <div className="mt-3 space-y-1.5">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    تحميل الخط
                  </a>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
                      {font.source}
                    </span>
                    {font.sourceUrl && font.sourceUrl !== link && (
                      <a
                        href={font.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        صفحة الخط
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WebFontResults;
