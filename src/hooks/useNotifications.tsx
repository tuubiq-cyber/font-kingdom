import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

/**
 * Polls for resolved requests that haven't been notified yet,
 * shows a toast, and marks them as notified.
 */
const useNotifications = () => {
  const { user } = useAuth();
  const lastCheckRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (!user?.id) return;

    const checkForUpdates = async () => {
      const { data, error } = await supabase
        .from("manual_identification_queue")
        .select("id, assigned_font_name, query_text, is_notified")
        .eq("user_id", user.id)
        .eq("status", "resolved")
        .eq("is_notified", false)
        .not("assigned_font_name", "is", null);

      if (error || !data || data.length === 0) return;

      for (const item of data) {
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

        // Mark as notified
        await supabase
          .from("manual_identification_queue")
          .update({ is_notified: true } as any)
          .eq("id", item.id);
      }
    };

    // Check immediately then every 30 seconds
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);
};

export default useNotifications;
