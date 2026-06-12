import { LayoutDashboard, Users, Sparkles, Settings, History, FileText, Send, LogOut, Calendar, BarChart3, Image, TrendingUp, CheckCircle2, RefreshCw, GitBranch } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/use-auth";
import { useAllTopics } from "@/hooks/use-marketing-data";
import southparcLogo from "@/assets/southparc-logo.png.asset.json";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { data: allTopics } = useAllTopics();

  // Aantal posts dat op goedkeuring wacht — het dagelijkse werk
  const pendingCount =
    allTopics?.filter((t) => t.generated_content && !t.posted_at && t.client_approved !== true).length ?? 0;

  const sections: NavSection[] = [
    {
      label: "Vandaag",
      items: [
        { title: "Dashboard", url: "/", icon: LayoutDashboard },
        { title: "Pipeline", url: "/pipeline", icon: GitBranch },
        { title: "Goedkeuring", url: "/goedkeuring", icon: CheckCircle2, badge: pendingCount },
        { title: "Publiceren", url: "/publiceren", icon: Send },
      ],
    },
    {
      label: "Campagnes",
      items: [
        { title: "Recurring", url: "/recurring", icon: RefreshCw },
        { title: "Voorraad & campagne", url: "/campagne", icon: Sparkles },
        { title: "Losse content", url: "/content", icon: FileText },
        { title: "Kalender", url: "/kalender", icon: Calendar },
      ],
    },
    {
      label: "Inzicht",
      items: [
        { title: "Analytics", url: "/analytics", icon: BarChart3 },
        { title: "Trends", url: "/trends", icon: TrendingUp },
        { title: "Geschiedenis", url: "/geschiedenis", icon: History },
      ],
    },
    {
      label: "Beheer",
      items: [
        { title: "Klanten", url: "/klanten", icon: Users },
        { title: "Media", url: "/media", icon: Image },
        { title: "Instellingen", url: "/instellingen", icon: Settings },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center overflow-hidden">
              <img src={southparcLogo.url} alt="Southparc" className="h-7 w-7 object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-sidebar-primary-foreground">Southparc Content</h1>
              <p className="text-xs text-sidebar-foreground/60">Content Engine</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center mx-auto overflow-hidden">
            <img src={southparcLogo.url} alt="Southparc" className="h-7 w-7 object-contain" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-xs tracking-wider">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent text-sidebar-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && (
                          <span className="flex items-center gap-2 flex-1">
                            {item.title}
                            {!!item.badge && (
                              <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 leading-none">
                                {item.badge}
                              </span>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4">
        {!collapsed && user && (
          <p className="text-xs text-sidebar-foreground/50 truncate mb-2">{user.email}</p>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Uitloggen</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/40 mt-2">
            v{__APP_VERSION__} · build {__BUILD_DATE__}
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
