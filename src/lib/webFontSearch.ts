// Web font search using Puter.js + Perplexity Sonar

declare global {
  interface Window {
    puter: {
      ai: {
        chat: (prompt: string, options?: { model?: string }) => Promise<string>;
      };
    };
  }
}

export interface WebFontMatch {
  name: string;
  nameAr: string;
  source: string;
  sourceUrl: string;
  confidence: number;
  description: string;
}

const FONT_PLATFORMS = [
  { name: "Google Fonts", domain: "fonts.google.com" },
  { name: "ArabFonts", domain: "arabfonts.com" },
  { name: "FontFace", domain: "fontface.me" },
  { name: "Arfonts", domain: "arfonts.net" },
  { name: "Behance", domain: "behance.net" },
];

export async function searchFontOnWeb(
  fontName: string,
  extractedText: string
): Promise<WebFontMatch[]> {
  if (!window.puter?.ai?.chat) {
    console.warn("Puter.js not loaded");
    return [];
  }

  const platformList = FONT_PLATFORMS.map((p) => `${p.name} (${p.domain})`).join(", ");

  const prompt = `ابحث عن الخط العربي "${fontName}" عبر الانترنت.
النص المستخرج من الصورة: "${extractedText}"

ابحث في هذه المنصات: ${platformList}

اعطني نتائج بصيغة JSON فقط بدون اي نص اخر:
{
  "results": [
    {
      "name": "اسم الخط بالانجليزية",
      "nameAr": "اسم الخط بالعربية",
      "source": "اسم المنصة",
      "sourceUrl": "رابط التحميل المباشر",
      "confidence": 85,
      "description": "وصف مختصر بالعربية"
    }
  ]
}

اذا لم تجد نتائج اعد مصفوفة فارغة. لا تخترع روابط غير موجودة.`;

  try {
    const response = await window.puter.ai.chat(prompt, {
      model: "perplexity/sonar",
    });

    let jsonStr = typeof response === "string" ? response : String(response);
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    // Try to extract JSON object
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    const parsed = JSON.parse(jsonStr);
    return (parsed.results || []) as WebFontMatch[];
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
      // continue with next font
    }
  }

  return allResults.sort((a, b) => b.confidence - a.confidence);
}
