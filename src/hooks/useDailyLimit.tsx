import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REQUEST_LIMIT = 5;
const WINDOW_HOURS = 5;

export const useDailyLimit = () => {
  const [checking, setChecking] = useState(false);

  const getWindowStart = () => {
    const now = new Date();
    now.setHours(now.getHours() - WINDOW_HOURS);
    return now.toISOString();
  };

  const checkAndConsume = useCallback(async (
    userId: string,
    serviceType: "image_identification" | "name_search"
  ): Promise<boolean> => {
    setChecking(true);
    try {
      const windowStart = getWindowStart();
      const { count, error: countError } = await supabase
        .from("daily_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("service_type", serviceType)
        .gte("created_at", windowStart);

      if (countError) throw countError;

      if ((count ?? 0) >= REQUEST_LIMIT) {
        toast.error("لقد استنفدت طلباتك (5 طلبات كل 5 ساعات). حاول مجدداً لاحقاً", {
          duration: 5000,
        });
        return false;
      }

      const { error: insertError } = await supabase
        .from("daily_usage")
        .insert({
          user_id: userId,
          service_type: serviceType,
        });

      if (insertError) throw insertError;
      return true;
    } catch (e) {
      console.error("Limit check error:", e);
      return true;
    } finally {
      setChecking(false);
    }
  }, []);

  const getRemainingCount = useCallback(async (
    userId: string,
    serviceType: "image_identification" | "name_search"
  ): Promise<number> => {
    try {
      const windowStart = getWindowStart();
      const { count } = await supabase
        .from("daily_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("service_type", serviceType)
        .gte("created_at", windowStart);

      return REQUEST_LIMIT - (count ?? 0);
    } catch {
      return REQUEST_LIMIT;
    }
  }, []);

  return { checkAndConsume, getRemainingCount, checking, DAILY_LIMIT: REQUEST_LIMIT };
};
