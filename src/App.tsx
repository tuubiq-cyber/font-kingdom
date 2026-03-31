import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import AdminFonts from "./pages/AdminFonts";
import FontTraining from "./pages/FontTraining";
import ModelBrain from "./pages/ModelBrain";
import AdminQueue from "./pages/AdminQueue";
import SecurityDashboard from "./pages/SecurityDashboard";
import MyRequests from "./pages/MyRequests";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminRoute from "./components/AdminRoute";
import AuthGuard from "./components/AuthGuard";
import useNotifications from "./hooks/useNotifications";
import LanguageSwitcher from "./components/LanguageSwitcher";

const queryClient = new QueryClient();

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  useNotifications();
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
            <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
            <Route path="/admin" element={<AuthGuard><AdminRoute><AdminFonts /></AdminRoute></AuthGuard>} />
            <Route path="/train" element={<AuthGuard><AdminRoute><FontTraining /></AdminRoute></AuthGuard>} />
            <Route path="/admin/brain" element={<AuthGuard><AdminRoute><ModelBrain /></AdminRoute></AuthGuard>} />
            <Route path="/admin/queue" element={<AuthGuard><AdminRoute><AdminQueue /></AdminRoute></AuthGuard>} />
            <Route path="/admin/security" element={<AuthGuard><AdminRoute><SecurityDashboard /></AdminRoute></AuthGuard>} />
            <Route path="/my-requests" element={<AuthGuard><MyRequests /></AuthGuard>} />
            <Route path="/login" element={<Login />} />
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
