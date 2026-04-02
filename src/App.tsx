import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Klanten from "@/pages/Klanten";
import Campagne from "@/pages/Campagne";
import ContentGeneratie from "@/pages/ContentGeneratie";
import Publiceren from "@/pages/Publiceren";
import Geschiedenis from "@/pages/Geschiedenis";
import Instellingen from "@/pages/Instellingen";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ProtectedRoute>
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/klanten" element={<Klanten />} />
                <Route path="/campagne" element={<Campagne />} />
                <Route path="/content" element={<ContentGeneratie />} />
                <Route path="/publiceren" element={<Publiceren />} />
                <Route path="/geschiedenis" element={<Geschiedenis />} />
                <Route path="/instellingen" element={<Instellingen />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
