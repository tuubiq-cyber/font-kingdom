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

    const prompt = `You are a font expert. Search for the Arabic font "${fontName}" across these major font platforms and provide REAL, verified download links.

Platforms to search:
- Google Fonts (fonts.google.com) — use googleapis.com CSS links
- DaFont Arabic (dafontfree.io, dafonts.co)
- Font Squirrel (fontsquirrel.com)
- ArabFonts (arbfonts.com)
- Fontspace (fontspace.com)
- 1001fonts (1001fonts.com)
- FontFace (fontface.me)
- Arfonts (arfonts.net)

${extractedText ? `The text in the image reads: "${extractedText}"` : ""}

IMPORTANT RULES:
1. Only return fonts that ACTUALLY EXIST on these platforms
2. For Google Fonts, use the format: https://fonts.googleapis.com/css2?family=FONTNAME&display=swap
3. Provide the DIRECT download page URL for each platform
4. Include similar/alternative Arabic fonts if the exact font is not found
5. For each result include: file format (TTF/OTF/WOFF2), whether it's free or commercial

Return ONLY a JSON object:
{
  "results": [
    {
      "name": "Font name in English",
      "nameAr": "اسم الخط بالعربية",
      "source": "Platform name",
      "sourceUrl": "Direct download page URL",
      "downloadUrl": "Direct file download URL if available",
      "confidence": 90,
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
