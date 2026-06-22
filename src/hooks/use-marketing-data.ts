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
  cta_url: string;
  read_url?: string;
  lead_magnet: string;
  buffer_token: string;
  buffer_profiles?: Record<string, string>;
  // Beeld-overrides (leeg/null = globale default uit mm_image_settings)
  img_provider?: string | null;
  img_model?: string | null;
  img_quality?: string | null;
  img_style_prompt?: string | null;
  img_negative_prompt?: string | null;
  brand_colors?: string[] | null;
  img_seed?: number | null;
  created_at: string;
  updated_at: string;
}

export interface MmPlatformSchedule {
  x_per_day: number;
  linkedin_per_week: number;
  instagram_per_week: number;
}

export interface MmRecurringCampaign {
  id: string;
  client_id: string;
  campaign_id: string | null;
  theme: string;
  onderwerp: string;
  keyword: string;
  keywords: string[];
  keyword_index: number;
  platforms: string[];
  platform_schedule: MmPlatformSchedule;
  auto_platforms: string[];
  frequency_per_week: number;
  auto_publish: boolean;
  active: boolean;
  last_run_at: string | null;
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
  content_format: "post" | "carousel" | "thread" | "video" | "poll" | null;
  generated_content: string | null;
  variant_of: string | null;
  media_url: string | null;
  client_approved: boolean | null;
  client_feedback: string | null;
  posted_at: string | null;
  created_at: string;
}

export interface MmSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface MmMediaItem {
  id: string;
  client_id: string;
  url: string;
  type: "image" | "video" | "carousel";
  alt_text: string | null;
  tags: string | null;
  created_at: string;
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

// ---- All Topics (across campaigns) ----
export function useAllTopics() {
  return useQuery({
    queryKey: ["mm_topics_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mm_topics")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MmTopic[];
    },
  });
}

// ---- Media Library ----
export function useMediaItems() {
  return useQuery({
    queryKey: ["mm_media"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mm_media")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MmMediaItem[];
    },
  });
}

export function useCreateMediaItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<MmMediaItem, "id" | "created_at">) => {
      const { data, error } = await supabase.from("mm_media").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_media"] }),
  });
}

export function useDeleteMediaItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mm_media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_media"] }),
  });
}

// ---- Recurring Campaigns ----
export function useRecurringCampaigns() {
  return useQuery({
    queryKey: ["mm_recurring_campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mm_recurring_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MmRecurringCampaign[];
    },
  });
}

export function useCreateRecurringCampaign() {
  const qc = useQueryClient();
  return useMutation({
    // Maakt eerst de mm_campaigns-rij waaronder gegenereerde topics in de app
    // verschijnen; de scheduler slaat recurring-rijen zonder campaign_id over.
    mutationFn: async (input: {
      client_id: string;
      theme: string;
      onderwerp: string;
      keyword: string;
      keywords: string[];
      platforms: string[];
      platform_schedule: MmPlatformSchedule;
      auto_platforms: string[];
      frequency_per_week: number;
      auto_publish: boolean;
    }) => {
      const { data: campaign, error: campaignError } = await supabase
        .from("mm_campaigns")
        .insert({ client_id: input.client_id, theme: input.theme, status: "active" })
        .select()
        .single();
      if (campaignError) throw campaignError;
      const { data, error } = await supabase
        .from("mm_recurring_campaigns")
        .insert({ ...input, campaign_id: campaign.id })
        .select()
        .single();
      if (error) throw error;
      return data as MmRecurringCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mm_recurring_campaigns"] });
      qc.invalidateQueries({ queryKey: ["mm_campaigns"] });
    },
  });
}

export function useUpdateRecurringCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MmRecurringCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("mm_recurring_campaigns")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as MmRecurringCampaign;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_recurring_campaigns"] }),
  });
}

export function useDeleteRecurringCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mm_recurring_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_recurring_campaigns"] }),
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
      const { error } = await supabase
        .from("mm_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_settings"] }),
  });
}

// ---- Image settings (globale defaults, singleton-rij 'global') ----
export interface MmImageSettings {
  id: string;
  provider: string;
  model: string;
  quality: string;
  style_prompt: string;
  negative_prompt: string;
  updated_at: string;
}

export function useImageSettings() {
  return useQuery({
    queryKey: ["mm_image_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mm_image_settings").select("*").eq("id", "global").maybeSingle();
      if (error) throw error;
      return data as MmImageSettings | null;
    },
  });
}

export function useUpdateImageSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Omit<MmImageSettings, "id" | "updated_at">>) => {
      const { error } = await supabase
        .from("mm_image_settings")
        .upsert({ id: "global", ...updates, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_image_settings"] }),
  });
}

// ---- Channel formats (platform -> pixels) ----
export interface MmChannelFormat {
  id: string;
  platform: string;
  width: number;
  height: number;
}

export function useChannelFormats() {
  return useQuery({
    queryKey: ["mm_channel_formats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mm_channel_formats").select("*").order("platform");
      if (error) throw error;
      return data as MmChannelFormat[];
    },
  });
}

export function useUpsertChannelFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (format: { platform: string; width: number; height: number }) => {
      const { error } = await supabase.from("mm_channel_formats").upsert(format, { onConflict: "platform" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mm_channel_formats"] }),
  });
}
