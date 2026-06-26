import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ClientSwitcher } from "@/components/ClientSwitcher";
import { ActiveClientProvider } from "@/hooks/use-active-client";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActiveClientProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center justify-between border-b bg-card px-4">
              <SidebarTrigger className="mr-4" />
              <ClientSwitcher />
            </header>
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ActiveClientProvider>
  );
}
