import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DAILY_LIMIT = 5;

export const useDailyLimit = () => {
  const [checking, setChecking] = useState(false);

  const checkAndConsume = useCallback(async (
    userId: string,
    serviceType: "image_identification" | "name_search"
  ): Promise<boolean> => {
    setChecking(true);
    try {
      // Count today's usage
      const today = new Date().toISOString().split("T")[0];
      const { count, error: countError } = await supabase
        .from("daily_usage" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("service_type", serviceType)
        .eq("used_at", today);

      if (countError) throw countError;

      if ((count ?? 0) >= DAILY_LIMIT) {
        toast.error("لقد استنفدت طلباتك اليومية (5 طلبات). اشترك للحصول على طلبات غير محدودة", {
          duration: 5000,
        });
        return false;
      }

      // Record usage
      const { error: insertError } = await supabase
        .from("daily_usage" as any)
        .insert({
          user_id: userId,
          service_type: serviceType,
          used_at: today,
        });

      if (insertError) throw insertError;
      return true;
    } catch (e) {
      console.error("Daily limit check error:", e);
      return true; // Allow on error to not block users
    } finally {
      setChecking(false);
    }
  }, []);

  const getRemainingCount = useCallback(async (
    userId: string,
    serviceType: "image_identification" | "name_search"
  ): Promise<number> => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("daily_usage" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("service_type", serviceType)
        .eq("used_at", today);

      return DAILY_LIMIT - (count ?? 0);
    } catch {
      return DAILY_LIMIT;
    }
  }, []);

  return { checkAndConsume, getRemainingCount, checking, DAILY_LIMIT };
};
