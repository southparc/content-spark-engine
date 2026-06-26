import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ClientHeader } from "@/components/ClientHeader";
import { ActiveClientProvider } from "@/hooks/use-active-client";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActiveClientProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <ClientHeader />
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ActiveClientProvider>
  );
}
