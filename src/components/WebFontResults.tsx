import { ExternalLink, Globe, Download } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WebFontMatch } from "@/lib/webFontSearch";

interface WebFontResultsProps {
  results: WebFontMatch[];
}

const isGoogleFontsUrl = (url: string) => {
  try {
    return new URL(url).hostname === "fonts.google.com";
  } catch {
    return false;
  }
};

const WebFontResults = ({ results }: WebFontResultsProps) => {
  const [loadingProxy, setLoadingProxy] = useState<string | null>(null);

  if (results.length === 0) return null;

  const handleGoogleFontProxy = async (url: string, fontName: string) => {
    setLoadingProxy(url);
    try {
      const { data, error } = await supabase.functions.invoke("font-proxy", {
        body: { url },
      });

      if (error) throw error;

      if (data?.previewUrl) {
        // Open the Google Fonts API CSS URL (not blocked)
        window.open(data.previewUrl, "_blank");
        toast.success(`تم فتح خط ${fontName} عبر الوسيط`);
      } else {
        toast.error("تعذر جلب معلومات الخط");
      }
    } catch (e) {
      console.warn("Font proxy failed:", e);
      toast.error("تعذر الوصول للخط عبر الوسيط");
    } finally {
      setLoadingProxy(null);
    }
  };

  const handleClick = (font: WebFontMatch) => {
    if (font.sourceUrl && isGoogleFontsUrl(font.sourceUrl)) {
      handleGoogleFontProxy(font.sourceUrl, font.name);
    } else if (font.sourceUrl) {
      window.open(font.sourceUrl, "_blank");
    }
  };

  return (
    <section className="space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" />
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
                <span className="text-[10px] font-medium bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                  {font.source}
                </span>
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
            </div>

            {font.sourceUrl && (
              <button
                onClick={() => handleClick(font)}
                disabled={loadingProxy === font.sourceUrl}
                className="btn-outline mt-3 w-full flex items-center justify-center gap-1.5 text-xs py-2"
              >
                {loadingProxy === font.sourceUrl ? (
                  <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                ) : isGoogleFontsUrl(font.sourceUrl) ? (
                  <Download className="w-3.5 h-3.5" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                {isGoogleFontsUrl(font.sourceUrl) ? `تحميل عبر الوسيط` : `فتح في ${font.source}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default WebFontResults;
