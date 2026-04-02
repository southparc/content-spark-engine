import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ---- Types ----
export interface MmClient {
  id: string;
  name: string;
  doelgroep: string;
  tone_of_voice: string;
  hashtags: string;
  branding: string;
  created_at: string;
  updated_at: string;
}

export interface MmCampaign {
  id: string;
  client_id: string;
  theme: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MmTopic {
  id: string;
  campaign_id: string;
  hook: string;
  platform: "linkedin" | "x" | "instagram";
  status: "pending" | "approved" | "rejected";
  generated_content: string | null;
  media_url: string | null;
  posted_at: string | null;
  created_at: string;
}

export interface MmSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

// ---- Clients ----
export function useClients() {
  return useQuery({
    queryKey: ["mm_clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mm_clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MmClient[];
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: Omit<MmClient, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("mm_clients").insert(client).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MmClient> & { id: string }) => {
      const { data, error } = await supabase.from("mm_clients").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_clients"] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mm_clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_clients"] }),
  });
}

// ---- Campaigns ----
export function useCampaigns(clientId?: string) {
  return useQuery({
    queryKey: ["mm_campaigns", clientId],
    queryFn: async () => {
      let q = supabase.from("mm_campaigns").select("*").order("created_at", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data as MmCampaign[];
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: { client_id: string; theme: string }) => {
      const { data, error } = await supabase.from("mm_campaigns").insert(campaign).select().single();
      if (error) throw error;
      return data as MmCampaign;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_campaigns"] }),
  });
}

// ---- Topics ----
export function useTopics(campaignId?: string) {
  return useQuery({
    queryKey: ["mm_topics", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mm_topics")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at");
      if (error) throw error;
      return data as MmTopic[];
    },
  });
}

export function useCreateTopics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topics: { campaign_id: string; hook: string; platform: string }[]) => {
      const { data, error } = await supabase.from("mm_topics").insert(topics).select();
      if (error) throw error;
      return data as MmTopic[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_topics"] }),
  });
}

export function useUpdateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MmTopic> & { id: string }) => {
      const { data, error } = await supabase.from("mm_topics").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_topics"] }),
  });
}

// ---- Settings ----
export function useSettings() {
  return useQuery({
    queryKey: ["mm_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mm_settings").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data as MmSetting[]).forEach((s) => (map[s.key] = s.value));
      return map;
    },
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase.from("mm_settings").update({ value }).eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_settings"] }),
  });
}
