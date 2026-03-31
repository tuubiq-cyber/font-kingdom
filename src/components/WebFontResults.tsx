import { ExternalLink, Globe } from "lucide-react";
import type { WebFontMatch } from "@/lib/webFontSearch";

interface WebFontResultsProps {
  results: WebFontMatch[];
}

const WebFontResults = ({ results }: WebFontResultsProps) => {
  if (results.length === 0) return null;

  return (
    <section className="space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-olive" />
        <h2 className="text-lg font-semibold text-foreground">نتائج البحث العالمي</h2>
      </div>

      <div className="grid gap-3">
        {results.map((font, i) => (
          <div
            key={`${font.name}-${font.source}-${i}`}
            className="font-card opacity-0 animate-fade-up"
            style={{ animationDelay: `${(i + 1) * 80}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-foreground font-semibold text-sm truncate">
                  {font.nameAr || font.name}
                </h3>
                <p className="text-muted-foreground text-xs mt-0.5">{font.name}</p>
                {font.description && (
                  <p className="text-muted-foreground text-[11px] mt-1 leading-relaxed line-clamp-2">
                    {font.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-[10px] font-medium bg-olive/15 text-olive px-2 py-0.5 rounded-full">
                  {font.source}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-olive rounded-full"
                      style={{ width: `${font.confidence}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{font.confidence}%</span>
                </div>
              </div>
            </div>

            {font.sourceUrl && (
              <a
                href={font.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline mt-3 w-full flex items-center justify-center gap-1.5 text-xs py-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                فتح في {font.source}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default WebFontResults;
