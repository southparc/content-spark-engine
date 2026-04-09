import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, Upload, Trash2, Copy, Check, Search, Film, FileImage } from "lucide-react";
import { useClients, useMediaItems, useCreateMediaItem, useDeleteMediaItem, type MmMediaItem } from "@/hooks/use-marketing-data";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function MediaLibrary() {
  const { data: clients } = useClients();
  const { data: mediaItems, isLoading } = useMediaItems();
  const createMedia = useCreateMediaItem();
  const deleteMedia = useDeleteMediaItem();
  const { toast } = useToast();

  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New item form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ client_id: "", url: "", type: "image", alt_text: "", tags: "" });

  const filteredItems = mediaItems?.filter((item) => {
    if (filterClient !== "all" && item.client_id !== filterClient) return false;
    if (filterType !== "all" && item.type !== filterType) return false;
    if (search && !item.alt_text?.toLowerCase().includes(search.toLowerCase()) && !item.tags?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) ?? [];

  const handleAdd = async () => {
    if (!newItem.client_id || !newItem.url) {
      toast({ title: "Vul alle verplichte velden in", variant: "destructive" });
      return;
    }
    try {
      await createMedia.mutateAsync({
        client_id: newItem.client_id,
        url: newItem.url,
        type: newItem.type as "image" | "video" | "carousel",
        alt_text: newItem.alt_text || null,
        tags: newItem.tags || null,
      });
      toast({ title: "Media toegevoegd!" });
      setDialogOpen(false);
      setNewItem({ client_id: "", url: "", type: "image", alt_text: "", tags: "" });
    } catch {
      toast({ title: "Fout bij toevoegen", variant: "destructive" });
    }
  };

  const handleCopyUrl = (item: MmMediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMedia.mutateAsync(id);
      toast({ title: "Media verwijderd" });
    } catch {
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    }
  };

  const typeIcon = (type: string) => {
    if (type === "video") return Film;
    if (type === "carousel") return FileImage;
    return Image;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Media Library</h1>
          <p className="text-muted-foreground">Beheer afbeeldingen, video's en carousels</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0 text-primary-foreground hover:opacity-90">
              <Upload className="h-4 w-4 mr-2" /> Media toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Media toevoegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Klant *</Label>
                <Select value={newItem.client_id} onValueChange={(v) => setNewItem((p) => ({ ...p, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Kies klant..." /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>URL *</Label>
                <Input
                  placeholder="https://..."
                  value={newItem.url}
                  onChange={(e) => setNewItem((p) => ({ ...p, url: e.target.value }))}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newItem.type} onValueChange={(v) => setNewItem((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Afbeelding</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alt tekst</Label>
                <Input
                  placeholder="Beschrijving..."
                  value={newItem.alt_text}
                  onChange={(e) => setNewItem((p) => ({ ...p, alt_text: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tags (kommagescheiden)</Label>
                <Input
                  placeholder="branding, product, team..."
                  value={newItem.tags}
                  onChange={(e) => setNewItem((p) => ({ ...p, tags: e.target.value }))}
                />
              </div>
              <Button onClick={handleAdd} disabled={createMedia.isPending} className="w-full gradient-primary border-0 text-primary-foreground">
                {createMedia.isPending ? "Toevoegen..." : "Toevoegen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoeken..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-[200px]"
          />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Alle klanten" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle klanten</SelectItem>
            {clients?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Alle types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle types</SelectItem>
            <SelectItem value="image">Afbeelding</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="carousel">Carousel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <Image className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nog geen media. Voeg je eerste item toe!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const TypeIcon = typeIcon(item.type);
            const clientName = clients?.find((c) => c.id === item.client_id)?.name ?? "";
            return (
              <Card key={item.id} className="overflow-hidden group">
                <div className="relative aspect-square bg-muted">
                  {item.type === "image" || item.type === "carousel" ? (
                    <img
                      src={item.url}
                      alt={item.alt_text || ""}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handleCopyUrl(item)}
                    >
                      {copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">
                      <TypeIcon className="h-2.5 w-2.5 mr-1" /> {item.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{clientName}</span>
                  </div>
                  {item.alt_text && (
                    <p className="text-xs text-muted-foreground truncate">{item.alt_text}</p>
                  )}
                  {item.tags && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.split(",").map((tag, i) => (
                        <span key={i} className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
