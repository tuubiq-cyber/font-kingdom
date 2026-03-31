import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Crown, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error("حدث خطأ أثناء تحديث كلمة المرور");
      console.error(error);
    } else {
      toast.success("تم تحديث كلمة المرور بنجاح");
      navigate("/");
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-foreground font-bold text-lg">رابط غير صالح</h1>
          <p className="text-muted-foreground text-sm">
            يرجى استخدام الرابط المرسل إلى بريدك الإلكتروني
          </p>
          <Link to="/login" className="btn-primary-interactive inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cta-shimmer">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6 relative z-10 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-1 hero-icon-glow">
            <Crown className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-foreground font-bold text-xl">تعيين كلمة مرور جديدة</h1>
          <p className="text-muted-foreground text-xs">أدخل كلمة المرور الجديدة لحسابك</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              placeholder="••••••••"
              className="w-full bg-card border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              dir="ltr"
              placeholder="••••••••"
              className="w-full bg-card border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary-interactive w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl cta-shimmer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              "تحديث كلمة المرور"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
