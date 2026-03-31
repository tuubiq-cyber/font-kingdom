import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock, UserPlus, Crown, ArrowRight, ShieldCheck, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { loginRateLimiter, validatePassword, sanitizeEmail, isValidEmail } from "@/lib/security";

const PasswordStrengthBar = ({ strength }: { strength: 'weak' | 'medium' | 'strong' }) => {
  const colors = { weak: 'bg-red-500', medium: 'bg-yellow-500', strong: 'bg-green-500' };
  const widths = { weak: 'w-1/3', medium: 'w-2/3', strong: 'w-full' };
  const labels = { weak: 'ضعيفة', medium: 'متوسطة', strong: 'قوية' };

  return (
    <div className="space-y-1">
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${colors[strength]} ${widths[strength]} transition-all duration-300 rounded-full`} />
      </div>
      <p className={`text-[10px] font-medium ${strength === 'weak' ? 'text-red-400' : strength === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
        قوة كلمة المرور: {labels[strength]}
      </p>
    </div>
  );
};

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const navigate = useNavigate();

  const logSecurityEvent = async (action: string, metadata?: Record<string, unknown>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("security_logs" as any).insert({
        user_id: user?.id || null,
        action,
        user_agent: navigator.userAgent,
        metadata: metadata || {},
      });
    } catch {
      // Silent fail for logging
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = sanitizeEmail(email);

    if (!loginRateLimiter.isAllowed(cleanEmail)) {
      const remaining = Math.ceil(loginRateLimiter.getRemainingTime(cleanEmail) / 60000);
      toast.error(`محاولات كثيرة. حاول بعد ${remaining} دقيقة`);
      await logSecurityEvent("login_rate_limited", { email: cleanEmail });
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      toast.error("بريد إلكتروني غير صالح");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (error) {
      toast.error("بيانات الدخول غير صحيحة");
      await logSecurityEvent("login_failed", { email: cleanEmail });
    } else {
      loginRateLimiter.reset(cleanEmail);
      await logSecurityEvent("login_success", { email: cleanEmail });
      navigate("/");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = sanitizeEmail(email);

    if (!isValidEmail(cleanEmail)) {
      toast.error("بريد إلكتروني غير صالح");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setPasswordErrors(validation.errors);
      toast.error("كلمة المرور لا تستوفي الشروط");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: cleanEmail, password });
    if (error) {
      toast.error(error.message);
      await logSecurityEvent("signup_failed", { email: cleanEmail, error: error.message });
    } else {
      toast.success("تم انشاء الحساب — تحقق من بريدك الالكتروني للتفعيل");
      await logSecurityEvent("signup_success", { email: cleanEmail });
      setIsSignUp(false);
      setPassword("");
      setConfirmPassword("");
      setPasswordErrors([]);
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

  const handlePhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error("أدخل رقم هاتف صالح");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      toast.error(error.message);
    } else {
      setOtpSent(true);
      toast.success("تم إرسال رمز التحقق");
    }
    setLoading(false);
  };

  const handlePhoneVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    if (error) {
      toast.error("رمز التحقق غير صحيح");
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const passwordValidation = isSignUp && password.length > 0 ? validatePassword(password) : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6 relative z-10 animate-fade-in">
        {/* Logo & Branding */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-1 hero-icon-glow">
              <Crown className="w-10 h-10 text-primary" />
            </div>
          </Link>
          <h1 className="text-foreground font-bold text-xl">مملكة الخطوط</h1>
          <p className="text-muted-foreground text-xs">
            {isSignUp ? "أنشئ حسابك للوصول لجميع الخدمات" : "سجّل دخولك للمتابعة"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-card border border-border/50 rounded-xl p-1">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setPasswordErrors([]); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              !isSignUp ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="w-4 h-4" />
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setPasswordErrors([]); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isSignUp ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            حساب جديد
          </button>
        </div>

        {/* Social Login */}
        <div className="space-y-2.5">
          <button
            onClick={() => handleSocialLogin("google")}
            disabled={!!socialLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-card border border-border/40 text-foreground font-medium text-sm hover:bg-muted hover:border-border transition-all duration-200 disabled:opacity-50"
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
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-card border border-border/40 text-foreground font-medium text-sm hover:bg-muted hover:border-border transition-all duration-200 disabled:opacity-50"
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
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-[11px] text-muted-foreground/60 px-2">أو</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        {/* Auth mode toggle: Email vs Phone */}
        <div className="flex bg-card border border-border/30 rounded-lg p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => { setAuthMode("email"); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${authMode === "email" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            البريد الإلكتروني
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode("phone"); setOtpSent(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${authMode === "phone" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Phone className="w-3.5 h-3.5" />
            رقم الهاتف
          </button>
        </div>

        {/* Phone Auth Form */}
        {authMode === "phone" ? (
          <form onSubmit={otpSent ? handlePhoneVerifyOtp : handlePhoneSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">رقم الهاتف</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                placeholder="+966 5xxxxxxxx"
                className="w-full bg-card border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
                required
                disabled={otpSent}
              />
            </div>
            {otpSent && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs text-muted-foreground font-medium">رمز التحقق</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  dir="ltr"
                  placeholder="123456"
                  maxLength={6}
                  className="w-full bg-card border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 text-center tracking-[0.5em] font-mono text-lg"
                  required
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary-interactive w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl cta-shimmer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : otpSent ? "تأكيد الرمز" : "إرسال رمز التحقق"}
            </button>
            {otpSent && (
              <button type="button" onClick={() => setOtpSent(false)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                تغيير رقم الهاتف
              </button>
            )}
          </form>
        ) : (
        /* Email Form */
        <form
          onSubmit={isSignUp ? handleSignUp : handleLogin}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">البريد الالكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              placeholder="example@email.com"
              className="w-full bg-card border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
              required
              maxLength={255}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (isSignUp && e.target.value.length > 0) {
                  const v = validatePassword(e.target.value);
                  setPasswordErrors(v.errors);
                }
              }}
              dir="ltr"
              placeholder="••••••••"
              className="w-full bg-card border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
              required
              maxLength={128}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
            {/* Password strength indicator */}
            {passwordValidation && (
              <div className="space-y-2 animate-fade-in">
                <PasswordStrengthBar strength={passwordValidation.strength} />
                {passwordErrors.length > 0 && (
                  <ul className="space-y-0.5">
                    {passwordErrors.map((err, i) => (
                      <li key={i} className="text-[10px] text-red-400 flex items-center gap-1">
                        <span>•</span> {err}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {isSignUp && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-xs text-muted-foreground font-medium">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
                placeholder="••••••••"
                className="w-full bg-card border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
                required
                maxLength={128}
                autoComplete="new-password"
              />
           </div>
          )}

          {!isSignUp && (
            <div className="text-left">
              <Link
                to="/forgot-password"
                className="text-xs text-primary/70 hover:text-primary transition-colors"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary-interactive w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl cta-shimmer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : isSignUp ? (
              "إنشاء الحساب"
            ) : (
              "تسجيل الدخول"
            )}
          </button>
        </form>
        )}

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/40">
          <ShieldCheck className="w-3 h-3" />
          <span>محمي بتشفير SSL و RLS</span>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <ArrowRight className="w-3 h-3" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
