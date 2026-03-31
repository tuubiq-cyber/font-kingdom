import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock, UserPlus } from "lucide-react";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("بيانات الدخول غير صحيحة");
    } else {
      navigate("/admin");
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
