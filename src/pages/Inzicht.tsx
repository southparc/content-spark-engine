import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Analytics from "./Analytics";
import Geschiedenis from "./Geschiedenis";
import ContentKalender from "./ContentKalender";

export default function Inzicht() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inzicht</h1>
        <p className="text-muted-foreground">Prestaties, geschiedenis en planning bij elkaar.</p>
      </div>
      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="geschiedenis">Geschiedenis</TabsTrigger>
          <TabsTrigger value="kalender">Kalender</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="mt-4"><Analytics /></TabsContent>
        <TabsContent value="geschiedenis" className="mt-4"><Geschiedenis /></TabsContent>
        <TabsContent value="kalender" className="mt-4"><ContentKalender /></TabsContent>
      </Tabs>
    </div>
  );
}
