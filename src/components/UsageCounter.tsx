import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Clock, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
const REQUEST_LIMIT = 5;
const WINDOW_HOURS = 5;

const UsageCounter = () => {
  const { user } = useAuth();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [nextReset, setNextReset] = useState<string>("");

  useEffect(() => {
    if (!user?.id) return;

    const fetchUsage = async () => {
      const windowStart = new Date();
      windowStart.setHours(windowStart.getHours() - WINDOW_HOURS);

      const { data, error } = await supabase
        .from("daily_usage")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", windowStart.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        setRemaining(REQUEST_LIMIT);
        return;
      }

      const used = data?.length ?? 0;
      setRemaining(Math.max(0, REQUEST_LIMIT - used));

      // Calculate time until oldest request expires (falls out of window)
      if (data && data.length > 0 && used >= REQUEST_LIMIT) {
        const oldest = new Date(data[0].created_at);
        const expiresAt = new Date(oldest.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
        updateCountdown(expiresAt);
      } else {
        setNextReset("");
      }
    };

    const updateCountdown = (expiresAt: Date) => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      if (diff <= 0) {
        setNextReset("الآن");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.ceil((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 0) {
        setNextReset(`${hours} س ${minutes} د`);
      } else {
        setNextReset(`${minutes} دقيقة`);
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [user?.id]);

  if (!user || remaining === null) return null;

  const usedCount = REQUEST_LIMIT - remaining;
  const percentage = (remaining / REQUEST_LIMIT) * 100;

  return (
    <div className="flex items-center justify-center animate-fade-in" style={{ animationDelay: "0.12s", animationFillMode: "both" }}>
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border/30 text-xs">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">الطلبات المتبقية:</span>
          <span className={`font-bold ${remaining === 0 ? "text-destructive" : "text-primary"}`}>
            {remaining.toLocaleString("ar-SA")}
          </span>
          <span className="text-muted-foreground">/ {REQUEST_LIMIT.toLocaleString("ar-SA")}</span>
        </div>

        {/* Mini progress bar */}
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${remaining === 0 ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {remaining === 0 && nextReset && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>تجديد بعد {nextReset}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageCounter;
