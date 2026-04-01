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

    // Get all queue items referencing fonts/queue/
    const { data: items, error: fetchErr } = await supabase
      .from("manual_identification_queue")
      .select("id, user_uploaded_image")
      .like("user_uploaded_image", "queue/%");

    if (fetchErr) throw fetchErr;
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ message: "No legacy images to migrate", migrated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; old: string; new: string; status: string }[] = [];

    for (const item of items) {
      const oldPath = item.user_uploaded_image; // e.g. queue/abc.png or queue/anon/uid/file.png
      const newPath = `legacy/${oldPath.replace("queue/", "")}`; // legacy/abc.png or legacy/anon/uid/file.png

      try {
        // Download from fonts bucket
        const { data: fileData, error: dlErr } = await supabase.storage
          .from("fonts")
          .download(oldPath);

        if (dlErr || !fileData) {
          results.push({ id: item.id, old: oldPath, new: newPath, status: `download_failed: ${dlErr?.message}` });
          continue;
        }

        // Upload to queue-images bucket
        const { error: upErr } = await supabase.storage
          .from("queue-images")
          .upload(newPath, fileData, { upsert: true });

        if (upErr) {
          results.push({ id: item.id, old: oldPath, new: newPath, status: `upload_failed: ${upErr.message}` });
          continue;
        }

        // Update DB reference
        const { error: updErr } = await supabase
          .from("manual_identification_queue")
          .update({ user_uploaded_image: newPath })
          .eq("id", item.id);

        if (updErr) {
          results.push({ id: item.id, old: oldPath, new: newPath, status: `db_update_failed: ${updErr.message}` });
          continue;
        }

        // Delete old file from fonts bucket
        await supabase.storage.from("fonts").remove([oldPath]);

        results.push({ id: item.id, old: oldPath, new: newPath, status: "migrated" });
      } catch (e) {
        results.push({ id: item.id, old: oldPath, new: newPath, status: `error: ${e.message}` });
      }
    }

    const migrated = results.filter((r) => r.status === "migrated").length;

    return new Response(JSON.stringify({ message: `Migration complete`, migrated, total: items.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});