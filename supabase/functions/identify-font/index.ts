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

    // Step 2: Identify fonts - only match against our database fonts
    const fontList = (dbFonts ?? []).map(f => `- ${f.name} (${f.name_ar}), style: ${f.style}`).join("\n");

    const systemPrompt = `You are a world-class Arabic typography expert. You must identify which font from the following list best matches the Arabic text in the image.

Available fonts:
${fontList}

IMPORTANT: You may ONLY match fonts from the list above. Do NOT suggest any font not in this list.

When given an image containing Arabic text:
1. Extract ALL Arabic text visible in the image accurately.
2. Analyze letterforms: stroke weight, contrast, terminals, dot shapes, letter proportions, connection style.
3. Match ONLY against the fonts listed above.

Return a JSON object with:
- "extractedText": the complete Arabic text found in the image (string)
- "matches": an array of matching fonts from the list above, ranked by confidence. Each object must have:
  - "name": the exact English name from the list
  - "nameAr": the Arabic name from the list
  - "style": the style from the list
  - "confidence": a number from 0 to 100
  - "reason": a brief Arabic explanation of why this font matches (without diacritics)
  - "category": one of "naskh", "kufi", "thuluth", "diwani", "ruqah", "nastaliq", "modern", "display"

If no font from the list matches well (confidence below 40), return an empty matches array.
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
    
    const enrichedFonts = matches.map((match: any) => {
      const dbFont = dbMap.get(match.name.toLowerCase());
      return {
        name: match.name,
        nameAr: dbFont?.name_ar || match.nameAr || match.name,
        style: dbFont?.style || match.style || "Regular",
        confidence: match.confidence || 0,
        reason: match.reason || "",
        fileUrl: dbFont?.file_url || null,
        license: dbFont?.license || null,
        category: match.category || "modern",
      };
    });

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
