import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Clean up orphaned files in fonts/queue/
    const orphans = [
      "queue/94acc60c-a735-42c0-b82c-824aae922202/0f631eba-0e95-4254-a16d-3177e27b29a6.png",
      "queue/anon/2f29bc41-93fe-4d4e-82e5-1e9985279908/648df1f0-63d0-4a60-806c-9b6dd86fd3ac.png",
      "queue/anon/2f29bc41-93fe-4d4e-82e5-1e9985279908/f874ce2f-5460-4256-a525-4505342abd5a.png",
    ];

    const { data, error } = await supabase.storage.from("fonts").remove(orphans);

    return new Response(JSON.stringify({ deleted: orphans, result: data, error: error?.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});