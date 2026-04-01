import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import AdminFonts from "./pages/AdminFonts";
import AdminDashboard from "./pages/AdminDashboard";
import FontTraining from "./pages/FontTraining";
import ModelBrain from "./pages/ModelBrain";
import AdminQueue from "./pages/AdminQueue";
import SecurityDashboard from "./pages/SecurityDashboard";
import AdminStats from "./pages/AdminStats";
import MyRequests from "./pages/MyRequests";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminRoute from "./components/AdminRoute";
import AuthGuard from "./components/AuthGuard";
import useNotifications from "./hooks/useNotifications";
import { useSecurityAlerts } from "./hooks/useSecurityAlerts";
import LanguageSwitcher from "./components/LanguageSwitcher";

const queryClient = new QueryClient();

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  useNotifications();
  useSecurityAlerts(); // Admin-only: auto-detects suspicious activity
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NotificationProvider>
          <LanguageSwitcher />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AuthGuard><AdminRoute><AdminDashboard /></AdminRoute></AuthGuard>} />
            <Route path="/admin/fonts" element={<AuthGuard><AdminRoute><AdminFonts /></AdminRoute></AuthGuard>} />
            <Route path="/train" element={<AuthGuard><AdminRoute><FontTraining /></AdminRoute></AuthGuard>} />
            <Route path="/admin/brain" element={<AuthGuard><AdminRoute><ModelBrain /></AdminRoute></AuthGuard>} />
            <Route path="/admin/queue" element={<AuthGuard><AdminRoute><AdminQueue /></AdminRoute></AuthGuard>} />
            <Route path="/admin/security" element={<AuthGuard><AdminRoute><SecurityDashboard /></AdminRoute></AuthGuard>} />
            <Route path="/admin/stats" element={<AuthGuard><AdminRoute><AdminStats /></AdminRoute></AuthGuard>} />
            <Route path="/my-requests" element={<MyRequests />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NotificationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
