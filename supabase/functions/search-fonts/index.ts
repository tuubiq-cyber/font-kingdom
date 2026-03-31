import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { fontName, extractedText } = await req.json();
    if (!fontName) {
      return new Response(
        JSON.stringify({ error: "fontName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are a world-class Arabic font expert. Search for the font "${fontName}" across ALL of these major official font platforms. Return REAL, verified results ONLY.

OFFICIAL PLATFORMS TO SEARCH (ALL 20):
1. Google Fonts — https://fonts.google.com (use googleapis.com CSS links for download)
2. Adobe Fonts — https://fonts.adobe.com
3. MyFonts — https://www.myfonts.com
4. Font Squirrel — https://www.fontsquirrel.com
5. DaFont — https://www.dafont.com
6. Fontspace — https://www.fontspace.com
7. 1001 Fonts — https://www.1001fonts.com
8. ArabFonts (عرب فونتس) — https://arbfonts.com
9. Arfonts — https://arfonts.net
10. FontFace — https://fontface.me
11. Behance — https://www.behance.net (font projects)
12. Creative Market — https://creativemarket.com
13. Envato Elements — https://elements.envato.com
14. Font Spring — https://www.fontspring.com
15. Urban Fonts — https://www.urbanfonts.com
16. Abstract Fonts — https://www.abstractfonts.com
17. FFonts — https://www.ffonts.net
18. Arabic Typography — https://arabictypography.com
19. Tasmeem — https://www.tasmeem.co
20. Linotype — https://www.linotype.com

${extractedText ? `The text in the image reads: "${extractedText}"` : ""}

CRITICAL RULES:
1. Search ALL 20 platforms above — return a result for EACH platform where this font or a similar one exists
2. Only return fonts that ACTUALLY EXIST — never fabricate URLs
3. For Google Fonts: use https://fonts.googleapis.com/css2?family=FONTNAME&display=swap
4. For each platform provide the DIRECT page URL where the user can download the font
5. If the exact font is not found on a platform, suggest the closest SIMILAR Arabic font available there
6. Mark exact matches vs similar suggestions clearly
7. Include file format (TTF/OTF/WOFF2) and license type (free/commercial/personal)
8. Return at least 10 results from different platforms

Return ONLY a JSON object:
{
  "results": [
    {
      "name": "Font name in English",
      "nameAr": "اسم الخط بالعربية",
      "source": "Platform name",
      "sourceUrl": "Direct download page URL",
      "downloadUrl": "Direct file download URL if available",
      "confidence": 95,
      "description": "وصف مختصر بالعربية",
      "format": "TTF",
      "license": "free",
      "isExactMatch": true
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert in Arabic typography and fonts. Always return valid JSON only. Never fabricate URLs — only include real, existing links.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ results: [], error: "rate_limited" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";

    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse:", content);
      parsed = { results: [] };
    }

    return new Response(
      JSON.stringify({ results: parsed.results || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("search-fonts error:", e);
    return new Response(
      JSON.stringify({ results: [], error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
