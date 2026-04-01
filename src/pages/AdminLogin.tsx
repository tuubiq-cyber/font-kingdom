import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const AdminLogin = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("أدخل كلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-login", {
        body: { password: password.trim() },
      });

      if (error) {
        toast.error("كلمة المرور غير صحيحة");
        setLoading(false);
        return;
      }

      if (data?.token_hash && data?.email) {
        // Verify the OTP token to establish session
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: "magiclink",
        });

        if (verifyError) {
          console.error("Verify error:", verifyError);
          toast.error("فشل تسجيل الدخول. حاول مرة أخرى");
        } else {
          toast.success("تم تسجيل الدخول كأدمن ✅");
          navigate("/admin/queue");
        }
      } else {
        toast.error("استجابة غير صالحة");
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ. حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px]" />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8 relative z-10">
        <div className="w-full max-w-[360px] space-y-6 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-1 hero-icon-glow">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-foreground font-bold text-xl">لوحة الإدارة</h1>
            <p className="text-muted-foreground text-sm">أدخل كلمة المرور للدخول</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium block">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  placeholder="••••••••"
                  className="w-full bg-card/80 border border-border/30 rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200 text-center tracking-widest font-mono text-lg"
                  required
                  autoFocus
                  autoComplete="current-password"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary-interactive w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl cta-shimmer active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  دخول
                </>
              )}
            </button>
          </form>

          {/* Back link */}
          <div className="text-center">
            <Link
              to="/home"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
