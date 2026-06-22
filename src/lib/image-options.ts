// Gedeelde keuzelijsten voor beeld-instellingen (globaal én per klant).
export const IMAGE_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "replicate", label: "Replicate" },
] as const;

export const IMAGE_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-image-1", label: "gpt-image-1 (beste kwaliteit)" },
    { value: "gpt-image-1-mini", label: "gpt-image-1-mini (sneller/goedkoper)" },
  ],
  replicate: [
    { value: "flux.2-pro", label: "FLUX.2 Pro" },
    { value: "ideogram-v3", label: "Ideogram v3" },
    { value: "recraft-v4-pro", label: "Recraft v4 Pro" },
    { value: "seedream-v5-lite", label: "Seedream v5 Lite" },
  ],
};

export const IMAGE_QUALITIES = [
  { value: "low", label: "Laag" },
  { value: "medium", label: "Middel" },
  { value: "high", label: "Hoog" },
] as const;
