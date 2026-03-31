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
import MyRequests from "./pages/MyRequests";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminRoute from "./components/AdminRoute";
import useNotifications from "./hooks/useNotifications";

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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminRoute><AdminFonts /></AdminRoute>} />
            <Route path="/train" element={<AdminRoute><FontTraining /></AdminRoute>} />
            <Route path="/admin/brain" element={<AdminRoute><ModelBrain /></AdminRoute>} />
            <Route path="/admin/queue" element={<AdminRoute><AdminQueue /></AdminRoute>} />
            <Route path="/my-requests" element={<MyRequests />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NotificationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
