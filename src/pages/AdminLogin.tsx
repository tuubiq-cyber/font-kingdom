import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, LogIn } from "lucide-react";
import { toast } from "sonner";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (user && isAdmin) {
      navigate("/admin", { replace: true });
    } else if (user && !adminLoading && !isAdmin) {
      toast.error("هذا الحساب ليس مسؤولاً");
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin-login",
      });
      if (result.error) {
        toast.error("فشل تسجيل الدخول");
      }
      if (result.redirected) return;
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setSigningIn(false);
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-sm border-border/50 bg-card/50">
        <CardContent className="p-8 flex flex-col items-center gap-6">
          <div className="p-4 rounded-full bg-primary/10">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold text-foreground">دخول المسؤول</h1>
            <p className="text-sm text-muted-foreground">سجّل دخولك للوصول للوحة التحكم</p>
          </div>
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleGoogleLogin}
            disabled={signingIn}
          >
            <LogIn className="w-5 h-5" />
            {signingIn ? "جارٍ تسجيل الدخول..." : "الدخول بحساب Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
