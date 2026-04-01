import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Pre-load audio and unlock on first user interaction
let audioContext: AudioContext | null = null;
let notificationBuffer: AudioBuffer | null = null;

const initAudio = async () => {
  if (audioContext) return;
  try {
    audioContext = new AudioContext();
    const response = await fetch("/notification.wav");
    const arrayBuffer = await response.arrayBuffer();
    notificationBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch {}
};

const playNotificationSound = () => {
  if (audioContext && notificationBuffer) {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    const source = audioContext.createBufferSource();
    source.buffer = notificationBuffer;
    const gain = audioContext.createGain();
    gain.gain.value = 0.5;
    source.connect(gain).connect(audioContext.destination);
    source.start(0);
    return;
  }
  try {
    const audio = new Audio("/notification.wav");
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
};

// Unlock audio on first user gesture
if (typeof window !== "undefined") {
  const unlock = () => {
    initAudio();
    window.removeEventListener("click", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("click", unlock);
  window.addEventListener("touchstart", unlock);
  window.addEventListener("keydown", unlock);
}

const showResolvedToast = (item: any) => {
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
};

const showRejectedToast = (item: any) => {
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
};

const markAsNotified = async (id: string, userId: string) => {
  await supabase.rpc("mark_queue_notified", {
    _id: id,
    _user_id: userId,
  });
};

/**
 * Polls for unnotified resolved/rejected items every 10 seconds.
 * Uses RPC for anonymous users, direct queries for authenticated.
 */
const useNotifications = () => {
  const { user } = useAuth();
  const lastCheckRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id || localStorage.getItem("visitor_id");
    if (!userId) return;

    const checkForNotifications = async () => {
      try {
        let resolved: any[] = [];
        let rejected: any[] = [];

        if (user?.id) {
          // Authenticated user - direct query (RLS allows)
          const { data: r } = await supabase
            .from("manual_identification_queue")
            .select("id, assigned_font_name, query_text")
            .eq("user_id", userId)
            .eq("status", "resolved")
            .eq("is_notified", false)
            .not("assigned_font_name", "is", null);
          resolved = r || [];

          const { data: rj } = await supabase
            .from("manual_identification_queue")
            .select("id, query_text, rejection_reason")
            .eq("user_id", userId)
            .eq("status", "rejected")
            .eq("is_notified", false);
          rejected = rj || [];
        } else {
          // Anonymous user - use RPC
          const { data } = await (supabase.rpc as any)("get_my_queue_items", {
            _visitor_id: userId,
          });
          const items = (data || []) as any[];
          resolved = items.filter(
            (i: any) => i.status === "resolved" && !i.is_notified && i.assigned_font_name
          );
          rejected = items.filter(
            (i: any) => i.status === "rejected" && !i.is_notified
          );
        }

        if (resolved.length > 0 || rejected.length > 0) {
          playNotificationSound();
        }

        for (const item of resolved) {
          showResolvedToast(item);
          await markAsNotified(item.id, userId);
        }

        for (const item of rejected) {
          showRejectedToast(item);
          await markAsNotified(item.id, userId);
        }
      } catch (e) {
        console.warn("Notification check failed:", e);
      }
    };

    // Initial check
    checkForNotifications();

    // Poll every 10 seconds
    const interval = setInterval(checkForNotifications, 10000);

    return () => clearInterval(interval);
  }, [user?.id]);
};

export default useNotifications;
