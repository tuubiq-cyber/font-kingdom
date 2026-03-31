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
import AdminRoute from "./components/AdminRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminFonts />} />
          <Route path="/train" element={<FontTraining />} />
          <Route path="/admin/brain" element={<ModelBrain />} />
          <Route path="/admin/queue" element={<AdminQueue />} />
          <Route path="/my-requests" element={<MyRequests />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
