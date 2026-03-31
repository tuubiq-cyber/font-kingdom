import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SecurityLog {
  id: string;
  user_id: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

const SecurityDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin } = useAdmin();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "failed" | "success">("all");

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("security_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter === "failed") {
      query = query.in("action", ["login_failed", "rate_limited"]);
    } else if (filter === "success") {
      query = query.eq("action", "login_success");
    }

    const { data } = await query;
    setLogs((data as SecurityLog[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [isAdmin, filter]);

  const stats = {
    total: logs.length,
    failed: logs.filter(l => l.action === "login_failed" || l.action === "rate_limited").length,
    success: logs.filter(l => l.action === "login_success").length,
    suspicious: logs.filter(l => l.action === "rate_limited").length,
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "login_success":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 ml-1" /> نجاح</Badge>;
      case "login_failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 ml-1" /> فشل</Badge>;
      case "rate_limited":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="w-3 h-3 ml-1" /> محظور</Badge>;
      case "signup_success":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><CheckCircle className="w-3 h-3 ml-1" /> تسجيل</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold">لوحة تحكم الأمان</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              العودة <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "serif" }}>{stats.total}</p>
              <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400" style={{ fontFamily: "serif" }}>{stats.success}</p>
              <p className="text-xs text-muted-foreground">دخول ناجح</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400" style={{ fontFamily: "serif" }}>{stats.failed}</p>
              <p className="text-xs text-muted-foreground">محاولات فاشلة</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400" style={{ fontFamily: "serif" }}>{stats.suspicious}</p>
              <p className="text-xs text-muted-foreground">محاولات مشبوهة</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(["all", "failed", "success"] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "الكل" : f === "failed" ? "فاشلة" : "ناجحة"}
            </Button>
          ))}
        </div>

        {/* Table */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">سجلات الأمان</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">لا توجد سجلات</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">البريد</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">تفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {(log.metadata as any)?.email || log.user_id?.slice(0, 8) || "مجهول"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {(log.metadata as any)?.error || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityDashboard;
