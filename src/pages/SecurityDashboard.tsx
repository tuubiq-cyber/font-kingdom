import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { useSecurityAlerts } from "@/hooks/useSecurityAlerts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Info, ShieldAlert, ShieldCheck, Bug, Bell, BellRing, Eye, EyeOff } from "lucide-react";

interface SecurityLog {
  id: string;
  user_id: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

interface SecurityFinding {
  id: string;
  name: string;
  description: string;
  level: "info" | "warn" | "error";
}

const KNOWN_FINDINGS: SecurityFinding[] = [
  {
    id: "leaked_password",
    name: "حماية كلمات المرور المسربة معطلة",
    description: "يُنصح بتفعيل فحص كلمات المرور المسربة لمنع المستخدمين من استخدام كلمات مرور مكشوفة في تسريبات سابقة.",
    level: "warn",
  },
  {
    id: "storage_policy",
    name: "سياسة التخزين — تقييد مسار المستخدم",
    description: "تم إصلاح سياسة رفع الملفات لفرض أن كل مستخدم يرفع ملفاته في مجلده الخاص فقط.",
    level: "info",
  },
  {
    id: "rls_active",
    name: "Row-Level Security مفعّل على جميع الجداول",
    description: "جميع الجداول محمية بسياسات RLS تمنع الوصول غير المصرح به.",
    level: "info",
  },
  {
    id: "role_protection",
    name: "حماية جدول الأدوار (RESTRICTIVE)",
    description: "تم تطبيق سياسة RESTRICTIVE لمنع أي مستخدم غير مشرف من تعديل الأدوار.",
    level: "info",
  },
  {
    id: "rate_limiting",
    name: "تحديد معدل محاولات الدخول",
    description: "5 محاولات كحد أقصى كل 15 دقيقة لمنع هجمات القوة الغاشمة.",
    level: "info",
  },
  {
    id: "realtime_disabled",
    name: "حماية البيانات الفورية (Realtime)",
    description: "تم استبدال Realtime بآلية جلب دوري (Polling) لحماية خصوصية طلبات المستخدمين.",
    level: "info",
  },
  {
    id: "visits_protected",
    name: "حماية بيانات الزيارات",
    description: "جدول الزيارات محمي — فقط المشرفون يمكنهم قراءة البيانات.",
    level: "info",
  },
];

const SecurityDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { activeAlerts, alerts: allAlerts, loading: alertsLoading, dismissAlert, refresh: refreshAlerts } = useSecurityAlerts();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "failed" | "success">("all");
  const [activeTab, setActiveTab] = useState<"alerts" | "findings" | "logs">("alerts");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("security_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter === "failed") {
      query = query.in("action", ["login_failed", "rate_limited"]);
    } else if (filter === "success") {
      query = query.eq("action", "login_success");
    }

    const { data } = await query;
    setLogs((data as SecurityLog[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [isAdmin, filter, fetchLogs]);

  const stats = {
    total: logs.length,
    failed: logs.filter(l => l.action === "login_failed" || l.action === "rate_limited").length,
    success: logs.filter(l => l.action === "login_success").length,
    suspicious: logs.filter(l => l.action === "rate_limited").length,
  };

  const findingsStats = {
    errors: KNOWN_FINDINGS.filter(f => f.level === "error").length,
    warnings: KNOWN_FINDINGS.filter(f => f.level === "warn").length,
    info: KNOWN_FINDINGS.filter(f => f.level === "info").length,
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "login_success":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1"><CheckCircle className="w-3 h-3" /> نجاح</Badge>;
      case "login_failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1"><XCircle className="w-3 h-3" /> فشل</Badge>;
      case "rate_limited":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1"><AlertTriangle className="w-3 h-3" /> محظور</Badge>;
      case "signup_success":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1"><CheckCircle className="w-3 h-3" /> تسجيل</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getFindingIcon = (level: string) => {
    switch (level) {
      case "error": return <ShieldAlert className="w-5 h-5 text-red-400" />;
      case "warn": return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <ShieldCheck className="w-5 h-5 text-green-400" />;
    }
  };

  const getFindingBorder = (level: string) => {
    switch (level) {
      case "error": return "border-red-500/30 bg-red-500/5";
      case "warn": return "border-yellow-500/30 bg-yellow-500/5";
      default: return "border-green-500/30 bg-green-500/5";
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
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

        {/* Stats Row */}
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

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border/50 pb-2">
          <Button
            variant={activeTab === "alerts" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("alerts")}
            className="gap-2"
          >
            {activeAlerts.length > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            التنبيهات
            {activeAlerts.length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-1.5">{activeAlerts.length}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "findings" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("findings")}
            className="gap-2"
          >
            <Bug className="w-4 h-4" />
            المشاكل والتحذيرات
            {findingsStats.warnings > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs px-1.5">{findingsStats.warnings}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "logs" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("logs")}
            className="gap-2"
          >
            <Shield className="w-4 h-4" />
            سجلات الدخول
          </Button>
        </div>

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <div className="space-y-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-primary" />
                    تنبيهات أمنية تلقائية
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={refreshAlerts} disabled={alertsLoading}>
                    <RefreshCw className={`w-4 h-4 ${alertsLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <CardDescription>
                  يتم فحص سجلات الأمان تلقائياً كل دقيقة للكشف عن أنماط مشبوهة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {alertsLoading && allAlerts.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : activeAlerts.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <ShieldCheck className="w-12 h-12 text-green-400 mx-auto" />
                    <p className="text-muted-foreground">لا توجد تنبيهات نشطة — النظام آمن ✅</p>
                  </div>
                ) : (
                  activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border ${
                        alert.severity === "critical"
                          ? "border-red-500/40 bg-red-500/10 animate-pulse"
                          : "border-yellow-500/30 bg-yellow-500/5"
                      }`}
                    >
                      <ShieldAlert className={`w-5 h-5 mt-0.5 ${
                        alert.severity === "critical" ? "text-red-400" : "text-yellow-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{alert.title}</p>
                          <Badge
                            variant="outline"
                            className={
                              alert.severity === "critical"
                                ? "text-red-400 border-red-500/30 text-xs"
                                : "text-yellow-400 border-yellow-500/30 text-xs"
                            }
                          >
                            {alert.severity === "critical" ? "حرج" : "عالي"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{alert.description}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {new Date(alert.detectedAt).toLocaleString("ar-SA")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                        className="shrink-0"
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}

                {/* Dismissed alerts summary */}
                {allAlerts.filter(a => a.dismissed).length > 0 && (
                  <p className="text-xs text-muted-foreground/50 text-center pt-2">
                    {allAlerts.filter(a => a.dismissed).length} تنبيه تم تجاهله
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Findings Tab */}
        {activeTab === "findings" && (
          <div className="space-y-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  حالة الأمان
                </CardTitle>
                <CardDescription>
                  {findingsStats.errors > 0
                    ? `${findingsStats.errors} مشكلة حرجة تحتاج إصلاح فوري`
                    : findingsStats.warnings > 0
                    ? `${findingsStats.warnings} تحذير يُنصح بمعالجته`
                    : "✅ لا توجد مشاكل حرجة — النظام آمن"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {KNOWN_FINDINGS.map(finding => (
                  <div
                    key={finding.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${getFindingBorder(finding.level)}`}
                  >
                    {getFindingIcon(finding.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{finding.name}</p>
                        <Badge
                          variant="outline"
                          className={
                            finding.level === "error"
                              ? "text-red-400 border-red-500/30 text-xs"
                              : finding.level === "warn"
                              ? "text-yellow-400 border-yellow-500/30 text-xs"
                              : "text-green-400 border-green-500/30 text-xs"
                          }
                        >
                          {finding.level === "error" ? "حرج" : finding.level === "warn" ? "تحذير" : "آمن"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{finding.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityDashboard;
