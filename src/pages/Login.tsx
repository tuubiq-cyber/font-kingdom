import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock, UserPlus, Mail } from "lucide-react";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("بيانات الدخول غير صحيحة");
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    if (password.length < 6) {
      toast.error("كلمة المرور يجب ان تكون 6 احرف على الاقل");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم انشاء الحساب — تحقق من بريدك الالكتروني للتفعيل");
      setIsSignUp(false);
      setPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error("حدث خطأ في تسجيل الدخول");
        console.error(error);
      }
    } catch (e) {
      toast.error("حدث خطأ غير متوقع");
      console.error(e);
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Tabs */}
        <div className="flex bg-card border border-border/50 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
              !isSignUp ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="w-4 h-4" />
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isSignUp ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            حساب جديد
          </button>
        </div>

        {/* Social Login */}
        <div className="space-y-2">
          <button
            onClick={() => handleSocialLogin("google")}
            disabled={!!socialLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-card border border-border/50 text-foreground font-medium text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            {socialLoading === "google" ? (
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            الدخول بحساب Google
          </button>

          <button
            onClick={() => handleSocialLogin("apple")}
            disabled={!!socialLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-card border border-border/50 text-foreground font-medium text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            {socialLoading === "apple" ? (
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            )}
            الدخول بحساب Apple
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-xs text-muted-foreground">أو</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        {/* Form */}
        <form
          onSubmit={isSignUp ? handleSignUp : handleLogin}
          className="font-card space-y-5"
        >
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">البريد الالكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>

          {isSignUp && (
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">تاكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                required
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mx-auto" />
            ) : isSignUp ? (
              "انشاء الحساب"
            ) : (
              "دخول"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
