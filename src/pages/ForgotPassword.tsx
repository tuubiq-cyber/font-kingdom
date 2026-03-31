import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Crown, Mail, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("حدث خطأ أثناء إرسال رابط الاستعادة");
      console.error(error);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 animate-fade-in max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 animate-scale-in">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-foreground font-bold text-lg">تم إرسال رابط الاستعادة</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            تحقق من بريدك الإلكتروني <span className="text-foreground font-medium" dir="ltr">{email}</span> واتبع الرابط لإعادة تعيين كلمة المرور
          </p>
          <Link to="/login" className="btn-primary-interactive inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cta-shimmer">
            <ArrowRight className="w-4 h-4" />
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
          <Link to="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-1 hero-icon-glow">
              <Crown className="w-10 h-10 text-primary" />
            </div>
          </Link>
          <h1 className="text-foreground font-bold text-xl">استعادة كلمة المرور</h1>
          <p className="text-muted-foreground text-xs">أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              placeholder="example@email.com"
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
              "إرسال رابط الاستعادة"
            )}
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <ArrowRight className="w-3 h-3" />
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
