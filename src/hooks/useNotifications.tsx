import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Polls for resolved/rejected requests that haven't been notified yet,
 * shows a toast, and marks them as notified.
 * Works for both authenticated users and anonymous visitors.
 */
const useNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    const userId = user?.id || localStorage.getItem("visitor_id");
    if (!userId) return;

    const checkForUpdates = async () => {
      // Check resolved requests
      const { data: resolved } = await supabase
        .from("manual_identification_queue")
        .select("id, assigned_font_name, query_text, is_notified")
        .eq("user_id", userId)
        .eq("status", "resolved")
        .eq("is_notified", false)
        .not("assigned_font_name", "is", null);

      if (resolved && resolved.length > 0) {
        for (const item of resolved) {
          const label = item.query_text
            ? `تم الرد على استفسارك "${item.query_text}"`
            : "تم التعرف على الخط في طلبك";

          toast.success(label, {
            description: `الخط: ${item.assigned_font_name}`,
            duration: 8000,
            action: {
              label: "عرض",
              onClick: () => {
                window.location.href = "/my-requests";
              },
            },
          });

          await supabase
            .from("manual_identification_queue")
            .update({ is_notified: true } as any)
            .eq("id", item.id);
        }
      }

      // Check rejected requests
      const { data: rejected } = await supabase
        .from("manual_identification_queue")
        .select("id, query_text, rejection_reason, is_notified")
        .eq("user_id", userId)
        .eq("status", "rejected")
        .eq("is_notified", false);

      if (rejected && rejected.length > 0) {
        for (const item of rejected as any[]) {
          const label = item.query_text
            ? `تم رفض استفسارك "${item.query_text}"`
            : "تم رفض طلبك";

          toast.error(label, {
            description: item.rejection_reason
              ? `السبب: ${item.rejection_reason}`
              : "يمكنك إرسال طلب جديد",
            duration: 8000,
            action: {
              label: "عرض",
              onClick: () => {
                window.location.href = "/my-requests";
              },
            },
          });

          await supabase
            .from("manual_identification_queue")
            .update({ is_notified: true } as any)
            .eq("id", item.id);
        }
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);
};

export default useNotifications;
