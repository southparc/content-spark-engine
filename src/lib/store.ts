// Local state management for Marketing Machine (before DB integration)
import { useState, useCallback } from "react";

export interface Client {
  id: string;
  name: string;
  doelgroep: string;
  toneOfVoice: string;
  hashtags: string;
  branding: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  hook: string;
  platform: "linkedin" | "x" | "instagram";
  status: "pending" | "approved" | "rejected";
}

export interface Campaign {
  id: string;
  clientId: string;
  theme: string;
  topics: Topic[];
  status: "draft" | "generating" | "review" | "approved" | "posted";
  createdAt: string;
}

// Simple ID generator
export const generateId = () => Math.random().toString(36).substring(2, 10);

// Demo clients
export const defaultClients: Client[] = [
  {
    id: "demo-1",
    name: "TechStartup BV",
    doelgroep: "B2B SaaS founders, CTOs",
    toneOfVoice: "Professioneel maar toegankelijk, thought leadership",
    hashtags: "#SaaS #TechNL #Innovation #Startup",
    branding: "Blauw/teal, modern, data-driven",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    name: "FitLife Academy",
    doelgroep: "Fitness enthusiasts 25-45, health-conscious",
    toneOfVoice: "Energiek, motiverend, persoonlijk",
    hashtags: "#Fitness #Gezondheid #Lifestyle #FitLife",
    branding: "Groen/oranje, energiek, lifestyle",
    createdAt: new Date().toISOString(),
  },
];
