import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, RefreshCw, Users, FileText, Eye, Clock,
  CheckCircle, XCircle, AlertTriangle, BarChart3, TrendingUp,
  Calendar, Inbox
} from "lucide-react";

interface Stats {
  totalVisits: number;
  todayVisits: number;
  totalRequests: number;
  pendingRequests: number;
  resolvedRequests: number;
  rejectedRequests: number;
  totalFonts: number;
  totalDataset: number;
  verifiedDataset: number;
  todayUsage: number;
  recentVisitsByDay: { date: string; count: number }[];
  recentRequestsByDay: { date: string; count: number }[];
}

const AdminStats = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      visitsRes,
      todayVisitsRes,
      requestsRes,
      pendingRes,
      resolvedRes,
      rejectedRes,
      fontsRes,
      datasetRes,
      verifiedRes,
      todayUsageRes,
      recentVisitsRes,
      recentRequestsRes,
    ] = await Promise.all([
      supabase.from("site_visits").select("id", { count: "exact", head: true }),
      supabase.from("site_visits").select("id", { count: "exact", head: true }).gte("visited_at", today),
      supabase.from("manual_identification_queue").select("id", { count: "exact", head: true }),
      supabase.from("manual_identification_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("manual_identification_queue").select("id", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("manual_identification_queue").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("fonts_library").select("id", { count: "exact", head: true }),
      supabase.from("font_dataset").select("id", { count: "exact", head: true }),
      supabase.from("font_dataset").select("id", { count: "exact", head: true }).eq("verified_by_admin", true),
      supabase.from("daily_usage").select("id", { count: "exact", head: true }).gte("used_at", today),
      supabase.from("site_visits").select("visited_at").gte("visited_at", sevenDaysAgo).order("visited_at", { ascending: true }),
      supabase.from("manual_identification_queue").select("created_at").gte("created_at", sevenDaysAgo).order("created_at", { ascending: true }),
    ]);

    // Group visits by day
    const visitsByDay = new Map<string, number>();
    (recentVisitsRes.data || []).forEach((v) => {
      const day = v.visited_at?.split("T")[0] || "";
      visitsByDay.set(day, (visitsByDay.get(day) || 0) + 1);
    });

    const requestsByDay = new Map<string, number>();
    (recentRequestsRes.data || []).forEach((r) => {
      const day = r.created_at?.split("T")[0] || "";
      requestsByDay.set(day, (requestsByDay.get(day) || 0) + 1);
    });

    setStats({
      totalVisits: visitsRes.count || 0,
      todayVisits: todayVisitsRes.count || 0,
      totalRequests: requestsRes.count || 0,
      pendingRequests: pendingRes.count || 0,
      resolvedRequests: resolvedRes.count || 0,
      rejectedRequests: rejectedRes.count || 0,
      totalFonts: fontsRes.count || 0,
      totalDataset: datasetRes.count || 0,
      verifiedDataset: verifiedRes.count || 0,
      todayUsage: todayUsageRes.count || 0,
      recentVisitsByDay: [...visitsByDay].map(([date, count]) => ({ date, count })),
      recentRequestsByDay: [...requestsByDay].map(([date, count]) => ({ date, count })),
    });
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchStats();
  }, [isAdmin, fetchStats]);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    accent,
    sub,
  }: {
    icon: React.ElementType;
    label: string;
    value: number;
    accent?: string;
    sub?: string;
  }) => (
    <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${accent || "bg-primary/10"}`}>
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "serif" }}>
          {value.toLocaleString("ar-SA")}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );

  const MiniChart = ({ data, label }: { data: { date: string; count: number }[]; label: string }) => {
    if (data.length === 0) return null;
    const max = Math.max(...data.map((d) => d.count), 1);
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 h-24">
            {data.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/80 rounded-t-sm min-h-[2px] transition-all"
                  style={{ height: `${(d.count / max) * 100}%` }}
                />
                <span className="text-[9px] text-muted-foreground/60">
                  {new Date(d.date).toLocaleDateString("ar-SA", { day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold">إحصائيات النظام</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              العودة <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Eye} label="إجمالي الزيارات" value={stats.totalVisits} sub={`اليوم: ${stats.todayVisits}`} />
          <StatCard icon={Inbox} label="إجمالي الطلبات" value={stats.totalRequests} accent="bg-blue-500/10" />
          <StatCard icon={FileText} label="مكتبة الخطوط" value={stats.totalFonts} accent="bg-green-500/10" />
          <StatCard icon={Clock} label="استخدامات اليوم" value={stats.todayUsage} accent="bg-yellow-500/10" />
        </div>

        {/* Requests Breakdown */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Inbox className="w-5 h-5 text-primary" />
              تفاصيل الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pendingRequests}</p>
                  <p className="text-xs text-muted-foreground">قيد الانتظار</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.resolvedRequests}</p>
                  <p className="text-xs text-muted-foreground">تم حلها</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                <XCircle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.rejectedRequests}</p>
                  <p className="text-xs text-muted-foreground">مرفوضة</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dataset Stats */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              بيانات التدريب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalDataset}</p>
                  <p className="text-xs text-muted-foreground">إجمالي العينات</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.verifiedDataset}</p>
                  <p className="text-xs text-muted-foreground">معتمدة</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mini Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MiniChart data={stats.recentVisitsByDay} label="الزيارات — آخر 7 أيام" />
          <MiniChart data={stats.recentRequestsByDay} label="الطلبات — آخر 7 أيام" />
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
