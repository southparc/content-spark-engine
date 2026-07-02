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
import KlantInstellingen from "@/pages/KlantInstellingen";
import Instellingen from "@/pages/Instellingen";
import InstellingenPrompts from "@/pages/InstellingenPrompts";
import InstellingenKlanten from "@/pages/InstellingenKlanten";
import InstellingenBeeld from "@/pages/InstellingenBeeld";
import RecurringCampaigns from "@/pages/RecurringCampaigns";
import Maken from "@/pages/Maken";
import Wachtrij from "@/pages/Wachtrij";
import Inzicht from "@/pages/Inzicht";
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
                <Route path="/klanten/:id" element={<KlantInstellingen />} />
                <Route path="/maken" element={<Maken />} />
                <Route path="/wachtrij" element={<Wachtrij />} />
                <Route path="/inzicht" element={<Inzicht />} />
                <Route path="/recurring" element={<RecurringCampaigns />} />
                <Route path="/instellingen" element={<Instellingen />} />
                <Route path="/instellingen/prompts" element={<InstellingenPrompts />} />
                <Route path="/instellingen/klanten" element={<InstellingenKlanten />} />
                <Route path="/instellingen/beeld" element={<InstellingenBeeld />} />
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
