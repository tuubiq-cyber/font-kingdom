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
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow proxying from known font domains
    const allowedDomains = [
      "fonts.google.com",
      "fonts.gstatic.com",
      "arabfonts.com",
      "fontface.me",
      "arfonts.net",
      "behance.net",
      "github.com",
    ];

    const parsed = new URL(url);
    if (!allowedDomains.some((d) => parsed.hostname.endsWith(d))) {
      return new Response(JSON.stringify({ error: "Domain not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For Google Fonts specimen pages, try to get the CSS with font file URLs
    if (parsed.hostname === "fonts.google.com" && parsed.pathname.startsWith("/specimen/")) {
      const fontFamily = parsed.pathname.split("/specimen/")[1]?.replace(/\+/g, " ");
      if (fontFamily) {
        // Fetch the CSS from Google Fonts API (this is not blocked, only the website is)
        const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
        const cssResp = await fetch(cssUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (cssResp.ok) {
          const css = await cssResp.text();
          // Extract font file URLs from CSS
          const fontUrls: string[] = [];
          const urlRegex = /url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g;
          let match;
          while ((match = urlRegex.exec(css)) !== null) {
            fontUrls.push(match[1]);
          }

          return new Response(
            JSON.stringify({
              fontFamily,
              cssUrl,
              fontUrls,
              previewUrl: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}&display=swap`,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // Generic proxy: fetch and return
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const contentType = resp.headers.get("Content-Type") || "application/octet-stream";
    const body = await resp.arrayBuffer();

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
