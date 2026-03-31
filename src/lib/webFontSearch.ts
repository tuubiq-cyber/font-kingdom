// Web font search using Edge Function + Lovable AI
import { supabase } from "@/integrations/supabase/client";

export interface WebFontMatch {
  name: string;
  nameAr: string;
  source: string;
  sourceUrl: string;
  downloadUrl?: string;
  confidence: number;
  description: string;
  format?: string;
  license?: string;
  isExactMatch?: boolean;
}

export async function searchFontOnWeb(
  fontName: string,
  extractedText: string
): Promise<WebFontMatch[]> {
  try {
    const { data, error } = await supabase.functions.invoke("search-fonts", {
      body: { fontName, extractedText },
    });

    if (error) {
      console.warn("Search fonts edge function error:", error);
      return [];
    }

    return (data?.results || []) as WebFontMatch[];
  } catch (e) {
    console.warn("Web font search failed:", e);
    return [];
  }
}

export async function searchMultipleFonts(
  fontNames: string[],
  extractedText: string
): Promise<WebFontMatch[]> {
  const allResults: WebFontMatch[] = [];
  const seen = new Set<string>();

  for (const name of fontNames.slice(0, 3)) {
    try {
      const results = await searchFontOnWeb(name, extractedText);
      for (const r of results) {
        const key = `${r.name}-${r.source}`.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          allResults.push(r);
        }
      }
    } catch {
      // continue
    }
  }

  return allResults.sort((a, b) => b.confidence - a.confidence);
}
