import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, type MmClient } from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";

export default function Klanten() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const [editingClient, setEditingClient] = useState<MmClient | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = (values: Omit<MmClient, "id" | "created_at" | "updated_at">) => {
    if (editingClient) {
      updateClient.mutate({ id: editingClient.id, ...values }, {
        onSuccess: () => {
          toast({ title: "Klant bijgewerkt", description: `${values.name} is opgeslagen.` });
          setEditingClient(null);
          setDialogOpen(false);
        },
      });
    } else {
      createClient.mutate(values, {
        onSuccess: () => {
          toast({ title: "Klant toegevoegd", description: `${values.name} is aangemaakt.` });
          setDialogOpen(false);
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteClient.mutate(id, {
      onSuccess: () => toast({ title: "Klant verwijderd" }),
    });
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
              loading={createClient.isPending || updateClient.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !clients?.length ? (
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingClient(client); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(client.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Doelgroep" value={client.doelgroep} />
                <InfoRow label="Tone of voice" value={client.tone_of_voice} />
                <InfoRow label="Hashtags" value={client.hashtags} />
                <InfoRow label="Branding" value={client.branding} />
                <InfoRow label="CTA-link (afspraak/download)" value={client.cta_url} />
                <InfoRow label="Lead magnet" value={client.lead_magnet} />
                <InfoRow label="Buffer-token" value={client.buffer_token ? "•••• ingesteld" : ""} />
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
  loading,
}: {
  initial: MmClient | null;
  onSave: (c: Omit<MmClient, "id" | "created_at" | "updated_at">) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [doelgroep, setDoelgroep] = useState(initial?.doelgroep ?? "");
  const [toneOfVoice, setToneOfVoice] = useState(initial?.tone_of_voice ?? "");
  const [hashtags, setHashtags] = useState(initial?.hashtags ?? "");
  const [branding, setBranding] = useState(initial?.branding ?? "");
  const [ctaUrl, setCtaUrl] = useState(initial?.cta_url ?? "");
  const [leadMagnet, setLeadMagnet] = useState(initial?.lead_magnet ?? "");
  const [bufferToken, setBufferToken] = useState(initial?.buffer_token ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, doelgroep, tone_of_voice: toneOfVoice, hashtags, branding, cta_url: ctaUrl, lead_magnet: leadMagnet, buffer_token: bufferToken });
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
      <div>
        <Label htmlFor="cta_url">CTA-link (afspraak/download-pagina)</Label>
        <Input id="cta_url" type="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://www.voorbeeld.nl/afspraak" />
        <p className="text-xs text-muted-foreground mt-1">Posts sluiten af met deze link, automatisch voorzien van UTM-tracking.</p>
      </div>
      <div>
        <Label htmlFor="lead_magnet">Lead magnet</Label>
        <Input id="lead_magnet" value={leadMagnet} onChange={(e) => setLeadMagnet(e.target.value)} placeholder="Bijv. whitepaper 'AI in 30 dagen', gratis scan..." />
      </div>
      <div>
        <Label htmlFor="buffer_token">Buffer API-token (van deze klant)</Label>
        <Input id="buffer_token" type="password" value={bufferToken} onChange={(e) => setBufferToken(e.target.value)} placeholder="Eigen Buffer-account van de klant" />
        <p className="text-xs text-muted-foreground mt-1">Publicaties lopen via het Buffer-account van de klant; de klant kan daar ook zelf handmatig posten.</p>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Annuleren</Button>
        <Button type="submit" disabled={loading}>{initial ? "Opslaan" : "Toevoegen"}</Button>
      </div>
    </form>
  );
}
