import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import AdminFonts from "./pages/AdminFonts";
import FontTraining from "./pages/FontTraining";
import ModelBrain from "./pages/ModelBrain";
import AdminQueue from "./pages/AdminQueue";
import SecurityDashboard from "./pages/SecurityDashboard";
import AdminStats from "./pages/AdminStats";
import MyRequests from "./pages/MyRequests";
import NotFound from "./pages/NotFound";
import useNotifications from "./hooks/useNotifications";
import { useSecurityAlerts } from "./hooks/useSecurityAlerts";

const queryClient = new QueryClient();

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  useNotifications();
  useSecurityAlerts();
  return <>{children}</>;
};

// Secret admin path - only those who know this URL can access admin pages
const ADMIN_SECRET_PATH = "kingdom-control-7x9m2";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NotificationProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Index />} />
            <Route path="/my-requests" element={<MyRequests />} />
            
            {/* Secret admin routes */}
            <Route path={`/${ADMIN_SECRET_PATH}/queue`} element={<AdminQueue />} />
            <Route path={`/${ADMIN_SECRET_PATH}/fonts`} element={<AdminFonts />} />
            <Route path={`/${ADMIN_SECRET_PATH}/brain`} element={<ModelBrain />} />
            <Route path={`/${ADMIN_SECRET_PATH}/security`} element={<SecurityDashboard />} />
            <Route path={`/${ADMIN_SECRET_PATH}/stats`} element={<AdminStats />} />
            <Route path={`/${ADMIN_SECRET_PATH}/train`} element={<FontTraining />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NotificationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
