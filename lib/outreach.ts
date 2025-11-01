"use client";

import { z } from "zod";

const PublisherSchema = z.object({
  id: z.string(),
  website: z.string(),
  websiteName: z.string(),
  rating: z.number(),
  doFollow: z.boolean(),
  outboundLinks: z.number(),
  niche: z.array(z.string()),
  type: z.enum(["Premium", "Standard"]),
  country: z.string(),
  language: z.string(),
  authority: z.object({ dr: z.number(), da: z.number(), as: z.number() }),
  spam: z.object({ percentage: z.number(), level: z.enum(["Low", "Medium", "High"]) }),
  pricing: z.object({ base: z.number(), withContent: z.number() }),
  trend: z.enum(["Stable", "Rising", "Falling"]),
});

const BrowseResponseSchema = z.object({
  publishers: z.array(PublisherSchema),
  total: z.number().int().nonnegative().optional(),
});

export type Publisher = z.infer<typeof PublisherSchema>;

const FALLBACK_PUBLISHERS: Publisher[] = [
  {
    id: "1",
    website: "techcrunch.com",
    websiteName: "TechCrunch",
    rating: 5,
    doFollow: true,
    outboundLinks: 2,
    niche: ["Technology"],
    type: "Premium",
    country: "United States",
    language: "English",
    authority: { dr: 92, da: 95, as: 0 },
    spam: { percentage: 1, level: "Low" },
    pricing: { base: 800, withContent: 850 },
    trend: "Stable",
  },
  {
    id: "2",
    website: "healthline.com",
    websiteName: "Healthline",
    rating: 5,
    doFollow: true,
    outboundLinks: 2,
    niche: ["Health & Fitness"],
    type: "Premium",
    country: "United States",
    language: "English",
    authority: { dr: 90, da: 93, as: 0 },
    spam: { percentage: 3, level: "Low" },
    pricing: { base: 750, withContent: 800 },
    trend: "Stable",
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export type BrowseParams = {
  niche?: string;
  country?: string;
  minDR?: number;
  maxDR?: number;
  type?: "Premium" | "Standard";
  searchQuery?: string;
  page?: number;
  pageSize?: number;
};

function buildQuery(params: BrowseParams) {
  const q = new URLSearchParams();
  if (params.niche) q.set("niche", params.niche);
  if (params.country) q.set("country", params.country);
  if (typeof params.minDR === "number") q.set("minDR", String(clamp(params.minDR, 0, 100)));
  if (typeof params.maxDR === "number") q.set("maxDR", String(clamp(params.maxDR, 0, 100)));
  if (params.type) q.set("type", params.type);
  if (params.searchQuery) q.set("q", params.searchQuery);
  q.set("page", String(params.page ?? 1));
  q.set("pageSize", String(params.pageSize ?? 20));
  return q.toString();
}

async function safeFetch(input: RequestInfo, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function browsePublishersClient(params: BrowseParams) {
  console.log('[OUTREACH] 📡 browsePublishersClient called:', params);
  const base = process.env.NEXT_PUBLIC_OUTREACH_API_URL || process.env.OUTREACH_API_URL;
  if (!base) {
    console.warn('[OUTREACH] ⚠️ OUTREACH_API_URL not configured, using fallback data');
    return { publishers: FALLBACK_PUBLISHERS, total: FALLBACK_PUBLISHERS.length, fallback: true };
  }

  try {
    const url = `${base.replace(/\/$/, "")}/publishers?${buildQuery(params)}`;
    console.log('[OUTREACH] 🌐 Fetching from API:', url);
    const fetchStartTime = performance.now();
    const res = await safeFetch(url, { headers: { "Content-Type": "application/json" } });
    const fetchDuration = performance.now() - fetchStartTime;
    
    console.log('[OUTREACH] 📥 API response received:', {
      status: res.status,
      statusText: res.statusText,
      duration: `${fetchDuration.toFixed(2)}ms`
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unable to read error');
      console.error('[OUTREACH] ❌ API error response:', { status: res.status, error: errorText });
      throw new Error(`Bad response: ${res.status} ${errorText}`);
    }
    
    const json = await res.json();
    console.log('[OUTREACH] 📦 Parsing response JSON:', {
      hasPublishers: Array.isArray(json.publishers),
      publisherCount: json.publishers?.length || 0,
      total: json.total
    });
    
    const parsed = BrowseResponseSchema.safeParse(json);
    if (!parsed.success) {
      console.error('[OUTREACH] ❌ Schema validation failed:', parsed.error);
      throw new Error("Invalid schema");
    }
    
    console.log('[OUTREACH] ✅ Successfully fetched and validated:', {
      publisherCount: parsed.data.publishers.length,
      total: parsed.data.total
    });
    
    return { ...parsed.data, fallback: false };
  } catch (error) {
    console.error('[OUTREACH] ⚠️ API fetch failed, using fallback:', error);
    // College WiFi / offline fallback
    return { publishers: FALLBACK_PUBLISHERS, total: FALLBACK_PUBLISHERS.length, fallback: true };
  }
}

export async function getPublisherDetailsClient(publisherId: string) {
  console.log('[OUTREACH] 📡 getPublisherDetailsClient called:', { publisherId });
  const base = process.env.NEXT_PUBLIC_OUTREACH_API_URL || process.env.OUTREACH_API_URL;
  if (!base) {
    console.warn('[OUTREACH] ⚠️ OUTREACH_API_URL not configured, using fallback data');
    const found = FALLBACK_PUBLISHERS.find((p) => p.id === publisherId);
    if (!found) {
      console.error('[OUTREACH] ❌ Publisher not found in fallback data:', publisherId);
      throw new Error("Not found");
    }
    return { publisher: found, fallback: true };
  }
  try {
    const url = `${base.replace(/\/$/, "")}/publishers/${encodeURIComponent(publisherId)}`;
    console.log('[OUTREACH] 🌐 Fetching from API:', url);
    const fetchStartTime = performance.now();
    const res = await safeFetch(url, { headers: { "Content-Type": "application/json" } });
    const fetchDuration = performance.now() - fetchStartTime;
    
    console.log('[OUTREACH] 📥 API response received:', {
      status: res.status,
      statusText: res.statusText,
      duration: `${fetchDuration.toFixed(2)}ms`
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unable to read error');
      console.error('[OUTREACH] ❌ API error response:', { status: res.status, error: errorText });
      throw new Error(`Bad response: ${res.status} ${errorText}`);
    }
    
    const json = await res.json();
    console.log('[OUTREACH] 📦 Parsing response JSON:', { hasPublisher: !!(json.publisher || json) });
    const parsed = PublisherSchema.safeParse(json.publisher ?? json);
    if (!parsed.success) {
      console.error('[OUTREACH] ❌ Schema validation failed:', parsed.error);
      throw new Error("Invalid schema");
    }
    
    console.log('[OUTREACH] ✅ Successfully fetched and validated publisher:', {
      publisherId: parsed.data.id,
      website: parsed.data.website
    });
    
    return { publisher: parsed.data, fallback: false };
  } catch (error) {
    console.error('[OUTREACH] ⚠️ API fetch failed, trying fallback:', error);
    const found = FALLBACK_PUBLISHERS.find((p) => p.id === publisherId);
    if (!found) {
      console.error('[OUTREACH] ❌ Publisher not found in fallback data:', publisherId);
      throw new Error("Not found");
    }
    return { publisher: found, fallback: true };
  }
}


