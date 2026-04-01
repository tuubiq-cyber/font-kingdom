import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";

export interface SecurityAlert {
  id: string;
  type: "brute_force" | "rate_limit_spike" | "suspicious_signup" | "mass_failed_logins";
  severity: "high" | "critical";
  title: string;
  description: string;
  detectedAt: string;
  metadata: Record<string, unknown>;
  dismissed: boolean;
}

const ALERT_THRESHOLDS = {
  /** Failed logins from same email in last 15 min */
  BRUTE_FORCE_LIMIT: 5,
  /** Total failed logins across all users in last 30 min */
  MASS_FAILED_LIMIT: 15,
  /** Rate limit hits in last 30 min */
  RATE_LIMIT_SPIKE: 5,
  /** Poll interval in ms */
  POLL_INTERVAL: 60000,
};

const DISMISSED_KEY = "security_alerts_dismissed";

const getDismissedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveDismissedIds = (ids: Set<string>) => {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
};

export const useSecurityAlerts = () => {
  const { isAdmin } = useAdmin();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const shownToastIds = useRef<Set<string>>(new Set());

  const analyzeSecurityLogs = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);

    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

    const { data: recentLogs } = await supabase
      .from("security_logs")
      .select("*")
      .gte("created_at", thirtyMinAgo)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!recentLogs || recentLogs.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const dismissed = getDismissedIds();
    const newAlerts: SecurityAlert[] = [];

    // 1. Brute force detection: multiple failed logins from same email
    const failedLogins = recentLogs.filter(
      (l) => l.action === "login_failed" && l.created_at && l.created_at >= fifteenMinAgo
    );
    const byEmail = new Map<string, typeof failedLogins>();
    for (const log of failedLogins) {
      const email = (log.metadata as any)?.email || "unknown";
      if (!byEmail.has(email)) byEmail.set(email, []);
      byEmail.get(email)!.push(log);
    }
    for (const [email, attempts] of byEmail) {
      if (attempts.length >= ALERT_THRESHOLDS.BRUTE_FORCE_LIMIT) {
        const alertId = `brute_force_${email}_${new Date().toDateString()}`;
        newAlerts.push({
          id: alertId,
          type: "brute_force",
          severity: "critical",
          title: `هجوم قوة غاشمة محتمل`,
          description: `${attempts.length} محاولة فاشلة للبريد ${email} خلال 15 دقيقة`,
          detectedAt: new Date().toISOString(),
          metadata: { email, attempts: attempts.length },
          dismissed: dismissed.has(alertId),
        });
      }
    }

    // 2. Mass failed logins
    if (failedLogins.length >= ALERT_THRESHOLDS.MASS_FAILED_LIMIT) {
      const alertId = `mass_failed_${new Date().toDateString()}_${Math.floor(now.getTime() / 1800000)}`;
      newAlerts.push({
        id: alertId,
        type: "mass_failed_logins",
        severity: "high",
        title: `ارتفاع غير طبيعي في محاولات الدخول الفاشلة`,
        description: `${failedLogins.length} محاولة فاشلة خلال آخر 30 دقيقة`,
        detectedAt: new Date().toISOString(),
        metadata: { count: failedLogins.length },
        dismissed: dismissed.has(alertId),
      });
    }

    // 3. Rate limit spikes
    const rateLimited = recentLogs.filter((l) => l.action === "rate_limit_hit");
    if (rateLimited.length >= ALERT_THRESHOLDS.RATE_LIMIT_SPIKE) {
      const alertId = `rate_spike_${Math.floor(now.getTime() / 1800000)}`;
      newAlerts.push({
        id: alertId,
        type: "rate_limit_spike",
        severity: "high",
        title: `ارتفاع في حالات تجاوز الحد`,
        description: `${rateLimited.length} حالة تجاوز حد الاستخدام خلال 30 دقيقة`,
        detectedAt: new Date().toISOString(),
        metadata: { count: rateLimited.length },
        dismissed: dismissed.has(alertId),
      });
    }

    // Show toast for new critical alerts
    for (const alert of newAlerts) {
      if (!alert.dismissed && !shownToastIds.current.has(alert.id)) {
        shownToastIds.current.add(alert.id);
        toast.error(`🚨 ${alert.title}`, {
          description: alert.description,
          duration: 10000,
          action: {
            label: "عرض",
            onClick: () => {
              window.location.href = "/admin/security";
            },
          },
        });
      }
    }

    setAlerts(newAlerts);
    setLoading(false);
  }, [isAdmin]);

  const dismissAlert = useCallback((alertId: string) => {
    const dismissed = getDismissedIds();
    dismissed.add(alertId);
    saveDismissedIds(dismissed);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, dismissed: true } : a))
    );
  }, []);

  const activeAlerts = alerts.filter((a) => !a.dismissed);

  useEffect(() => {
    if (!isAdmin) return;
    analyzeSecurityLogs();
    const interval = setInterval(analyzeSecurityLogs, ALERT_THRESHOLDS.POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isAdmin, analyzeSecurityLogs]);

  return { alerts, activeAlerts, loading, dismissAlert, refresh: analyzeSecurityLogs };
};
