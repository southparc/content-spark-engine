import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronDown } from "lucide-react";
import { useClients } from "@/hooks/use-marketing-data";
import { useActiveClient, ALL_CLIENTS } from "@/hooks/use-active-client";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";

export function ClientHeader() {
  const { data: clients } = useClients();
  const { activeClientId, setActiveClientId } = useActiveClient();

  const client = clients?.find((c) => c.id === activeClientId);
  const color = client?.banner_color || null;
  const name = client?.name || "Alle klanten";

  return (
    <header
      className="h-16 flex items-center justify-between border-b px-4 bg-card"
      style={color ? { background: `${color}14`, borderBottomColor: color, borderBottomWidth: 2 } : undefined}
    >
      <SidebarTrigger />
      <Select value={activeClientId} onValueChange={setActiveClientId}>
        <SelectTrigger className="h-11 gap-2 border-0 bg-transparent shadow-none px-2 hover:bg-black/5 focus:ring-0 w-auto [&>svg]:hidden">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ background: color || "var(--muted-foreground, #9ca3af)" }} />
          <span className="text-lg font-semibold text-foreground truncate max-w-[260px]">{name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value={ALL_CLIENTS}>Alle klanten</SelectItem>
          {clients?.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.banner_color || "transparent", border: c.banner_color ? "none" : "1px solid var(--border)" }} />
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </header>
  );
}
