import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3, FileText, Inbox, Brain, Shield, LogOut, ArrowRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const pages = [
  { path: "/admin/queue", icon: Inbox, label: "طابور الطلبات", desc: "مراجعة طلبات التعرف" },
  { path: "/admin/brain", icon: Brain, label: "عقل النموذج", desc: "بيانات التدريب" },
  { path: "/admin/fonts", icon: FileText, label: "مكتبة الخطوط", desc: "إدارة وإضافة الخطوط" },
  { path: "/my-requests", icon: BarChart3, label: "الطلبات", desc: "عرض طلبات المستخدمين" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              الرئيسية <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/");
              }}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {user && (
          <p className="text-sm text-muted-foreground">{user.email}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {pages.map((p) => (
            <Card
              key={p.path}
              className="cursor-pointer hover:border-primary/40 transition-colors bg-card/50 border-border/50"
              onClick={() => navigate(p.path)}
            >
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <p.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
