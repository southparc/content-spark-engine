import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { type Client, defaultClients, generateId } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export default function Klanten() {
  const [clients, setClients] = useState<Client[]>(defaultClients);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = (client: Omit<Client, "id" | "createdAt">) => {
    if (editingClient) {
      setClients((prev) =>
        prev.map((c) => (c.id === editingClient.id ? { ...c, ...client } : c))
      );
      toast({ title: "Klant bijgewerkt", description: `${client.name} is opgeslagen.` });
    } else {
      const newClient: Client = {
        ...client,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setClients((prev) => [...prev, newClient]);
      toast({ title: "Klant toegevoegd", description: `${client.name} is aangemaakt.` });
    }
    setEditingClient(null);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Klant verwijderd" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Klanten</h1>
          <p className="text-muted-foreground">Beheer je klanten en hun branding</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingClient(null); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe klant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Klant bewerken" : "Nieuwe klant"}</DialogTitle>
            </DialogHeader>
            <ClientForm
              initial={editingClient}
              onSave={handleSave}
              onCancel={() => { setDialogOpen(false); setEditingClient(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {clients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nog geen klanten. Voeg je eerste toe!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{client.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditingClient(client); setDialogOpen(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Doelgroep" value={client.doelgroep} />
                <InfoRow label="Tone of voice" value={client.toneOfVoice} />
                <InfoRow label="Hashtags" value={client.hashtags} />
                <InfoRow label="Branding" value={client.branding} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="text-foreground truncate">{value || "—"}</p>
    </div>
  );
}

function ClientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Client | null;
  onSave: (c: Omit<Client, "id" | "createdAt">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [doelgroep, setDoelgroep] = useState(initial?.doelgroep ?? "");
  const [toneOfVoice, setToneOfVoice] = useState(initial?.toneOfVoice ?? "");
  const [hashtags, setHashtags] = useState(initial?.hashtags ?? "");
  const [branding, setBranding] = useState(initial?.branding ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, doelgroep, toneOfVoice, hashtags, branding });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Naam</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="doelgroep">Doelgroep</Label>
        <Input id="doelgroep" value={doelgroep} onChange={(e) => setDoelgroep(e.target.value)} placeholder="B2B founders, marketeers..." />
      </div>
      <div>
        <Label htmlFor="tone">Tone of Voice</Label>
        <Textarea id="tone" value={toneOfVoice} onChange={(e) => setToneOfVoice(e.target.value)} placeholder="Professioneel, informeel..." rows={2} />
      </div>
      <div>
        <Label htmlFor="hashtags">Hashtags</Label>
        <Input id="hashtags" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#Marketing #AI" />
      </div>
      <div>
        <Label htmlFor="branding">Branding</Label>
        <Input id="branding" value={branding} onChange={(e) => setBranding(e.target.value)} placeholder="Kleuren, stijl..." />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Annuleren</Button>
        <Button type="submit">{initial ? "Opslaan" : "Toevoegen"}</Button>
      </div>
    </form>
  );
}
