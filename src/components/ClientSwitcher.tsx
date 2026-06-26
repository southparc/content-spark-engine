import { Users } from "lucide-react";
import { useClients } from "@/hooks/use-marketing-data";
import { useActiveClient, ALL_CLIENTS } from "@/hooks/use-active-client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function ClientSwitcher() {
  const { data: clients } = useClients();
  const { activeClientId, setActiveClientId } = useActiveClient();

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select value={activeClientId} onValueChange={setActiveClientId}>
        <SelectTrigger className="h-9 w-[200px]">
          <SelectValue placeholder="Kies een klant..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CLIENTS}>Alle klanten</SelectItem>
          {clients?.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
