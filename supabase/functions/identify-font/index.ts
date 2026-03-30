import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get all fonts from our database
    const { data: dbFonts } = await supabase.from("fonts").select("name, name_ar, style, file_url, license, preview_image_url");
    const fontNames = (dbFonts ?? []).map(f => f.name);

    const imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    // Step 2: Identify fonts from ALL web sources and extract text
    const systemPrompt = `You are a world-class Arabic typography expert with encyclopedic knowledge of Arabic fonts and calligraphy styles from ALL sources worldwide — Google Fonts, Adobe Fonts, Monotype, Linotype, Arabic foundries (Tasmeem, DecoType, Diwan), open-source projects, and commercial type foundries.

You specialize in Arabic script analysis including:
- Naskh, Nastaliq, Thuluth, Diwani, Ruq'ah, Kufi (geometric, foliated, square) styles
- Modern Arabic typefaces and display fonts
- Stroke contrast, kashida behavior, dot shapes, letter connections, baseline rhythm
- Weight variations, terminal styles, ascender/descender proportions

When given an image containing Arabic text:
1. Extract ALL Arabic text visible in the image accurately.
2. Analyze letterforms in detail: stroke weight, contrast, terminals, dot shapes, letter proportions, connection style, baseline alignment.
3. Match against your full knowledge of Arabic fonts globally.

Return a JSON object with:
- "extractedText": the complete Arabic text found in the image (string)
- "matches": an array of up to 5 font matches ranked by confidence. Each object must have:
  - "name": the exact English name of the font (e.g. "Amiri", "Cairo", "Tajawal")
  - "nameAr": the Arabic name of the font (without diacritics)
  - "style": the weight/style variant (e.g. "Regular", "Bold", "Light", "SemiBold")
  - "confidence": a number from 0 to 100
  - "reason": a brief Arabic explanation of why this font matches, describing specific typographic features (without diacritics)
  - "category": one of "naskh", "kufi", "thuluth", "diwani", "ruqah", "nastaliq", "modern", "display"

Only return the JSON object, nothing else. If no Arabic text is found, return {"extractedText": "", "matches": []}.`;

    const identifyResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "حدد الخطوط العربية المستخدمة في هذه الصورة واستخرج النص" },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
        }),
      }
    );

    if (!identifyResponse.ok) {
      if (identifyResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز الحد المسموح، يرجى المحاولة لاحقا" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (identifyResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى اضافة رصيد لاستخدام الذكاء الاصطناعي" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await identifyResponse.text();
      console.error("AI gateway error:", identifyResponse.status, text);
      throw new Error(`AI gateway error: ${identifyResponse.status}`);
    }

    const identifyData = await identifyResponse.json();
    const content = identifyData.choices?.[0]?.message?.content ?? "{}";

    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    let parsed: { extractedText?: string; matches?: any[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = { extractedText: "", matches: [] };
    }

    const extractedText = parsed.extractedText || "";
    const matches = parsed.matches || [];

    // Step 3: Build font results enriched with DB data
    const dbMap = new Map((dbFonts ?? []).map(f => [f.name.toLowerCase(), f]));
    
    // Step 4: Generate preview images for each matched font using AI
    const enrichedFonts = await Promise.all(
      matches.map(async (match: any) => {
        const dbFont = dbMap.get(match.name.toLowerCase());
        let previewImageUrl = dbFont?.preview_image_url || null;

        // Generate AI preview image with the extracted text in the identified font style
        if (extractedText && match.name) {
          try {
            const previewPrompt = `Create a clean, minimal image showing the following Arabic text rendered in ${match.name} font style. The text should be large, centered, on a pure white background. Text to render: "${extractedText}". Make it look like a professional font specimen/preview card. No decorations, just the text.`;
            
            const imgResponse = await fetch(
              "https://ai.gateway.lovable.dev/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-image",
                  messages: [{ role: "user", content: previewPrompt }],
                  modalities: ["image", "text"],
                }),
              }
            );

            if (imgResponse.ok) {
              const imgData = await imgResponse.json();
              const generatedImg = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              if (generatedImg) {
                previewImageUrl = generatedImg;
              }
            }
          } catch (imgErr) {
            console.error("Preview image generation failed for", match.name, imgErr);
          }
        }

        return {
          name: match.name,
          nameAr: dbFont?.name_ar || match.nameAr || match.name,
          style: dbFont?.style || match.style || "Regular",
          confidence: match.confidence || 0,
          reason: match.reason || "",
          fileUrl: dbFont?.file_url || null,
          license: dbFont?.license || null,
          previewImage: previewImageUrl,
          category: match.category || "modern",
        };
      })
    );

    return new Response(
      JSON.stringify({ fonts: enrichedFonts, extractedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("identify-font error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
