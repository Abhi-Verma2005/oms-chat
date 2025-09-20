import { generateObject } from "ai";
import { z } from "zod";

import { openaiFlashModel } from "../index";

// Types for publisher data
export interface PublisherData {
  id: string;
  website: string;
  websiteName: string;
  rating: number;
  doFollow: boolean;
  outboundLinks: number;
  niche: string[];
  type: "Premium" | "Standard";
  country: string;
  language: string;
  authority: {
    dr: number;
    da: number;
    as: number;
  };
  spam: {
    percentage: number;
    level: "Low" | "Medium" | "High";
  };
  pricing: {
    base: number;
    withContent: number;
  };
  trend: "Stable" | "Rising" | "Falling";
}

// Fallback data for when API is unavailable
const fallbackPublishersData: PublisherData[] = [
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
    trend: "Stable"
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
    trend: "Stable"
  },
  {
    id: "3",
    website: "nutrition.org",
    websiteName: "Nutrition.org",
    rating: 5,
    doFollow: true,
    outboundLinks: 2,
    niche: ["Health & Fitness", "Nutrition"],
    type: "Standard",
    country: "United States",
    language: "English",
    authority: { dr: 84, da: 88, as: 0 },
    spam: { percentage: 4, level: "Medium" },
    pricing: { base: 380, withContent: 430 },
    trend: "Stable"
  },
  {
    id: "4",
    website: "forbes.com",
    websiteName: "Forbes",
    rating: 5,
    doFollow: true,
    outboundLinks: 3,
    niche: ["Business", "Finance"],
    type: "Premium",
    country: "United States",
    language: "English",
    authority: { dr: 95, da: 98, as: 0 },
    spam: { percentage: 2, level: "Low" },
    pricing: { base: 1200, withContent: 1250 },
    trend: "Rising"
  },
  {
    id: "5",
    website: "wired.com",
    websiteName: "Wired",
    rating: 4,
    doFollow: true,
    outboundLinks: 2,
    niche: ["Technology", "Science"],
    type: "Premium",
    country: "United States",
    language: "English",
    authority: { dr: 88, da: 91, as: 0 },
    spam: { percentage: 2, level: "Low" },
    pricing: { base: 900, withContent: 950 },
    trend: "Stable"
  },
  {
    id: "6",
    website: "cnn.com",
    websiteName: "CNN",
    rating: 5,
    doFollow: true,
    outboundLinks: 4,
    niche: ["News", "Politics"],
    type: "Premium",
    country: "United States",
    language: "English",
    authority: { dr: 96, da: 99, as: 0 },
    spam: { percentage: 1, level: "Low" },
    pricing: { base: 1500, withContent: 1550 },
    trend: "Stable"
  },
  {
    id: "7",
    website: "bbc.com",
    websiteName: "BBC",
    rating: 5,
    doFollow: true,
    outboundLinks: 3,
    niche: ["News", "World Affairs"],
    type: "Premium",
    country: "United Kingdom",
    language: "English",
    authority: { dr: 94, da: 97, as: 0 },
    spam: { percentage: 1, level: "Low" },
    pricing: { base: 1300, withContent: 1350 },
    trend: "Stable"
  },
  {
    id: "8",
    website: "entrepreneur.com",
    websiteName: "Entrepreneur",
    rating: 4,
    doFollow: true,
    outboundLinks: 2,
    niche: ["Business", "Entrepreneurship"],
    type: "Standard",
    country: "United States",
    language: "English",
    authority: { dr: 82, da: 85, as: 0 },
    spam: { percentage: 5, level: "Medium" },
    pricing: { base: 450, withContent: 500 },
    trend: "Rising"
  }
];

// Function to fetch data from outreach dummy API
async function fetchPublishersFromAPI(filters?: {
  niche?: string;
  country?: string;
  minDR?: number;
  maxDR?: number;
  type?: string;
}): Promise<PublisherData[]> {
  try {
    // Simulate API call with timeout
    const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to simulate API failure
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    // Since this is a dummy API, we'll return our fallback data
    // In a real implementation, you would transform the API response
    return fallbackPublishersData;
  } catch (error) {
    console.log('API unavailable, using fallback data:', error);
    return fallbackPublishersData;
  }
}

// Function to filter publishers based on criteria
function filterPublishers(publishers: PublisherData[], filters?: {
  niche?: string;
  country?: string;
  minDR?: number;
  maxDR?: number;
  type?: string;
}): PublisherData[] {
  if (!filters) return publishers;

  return publishers.filter(publisher => {
    if (filters.niche && !publisher.niche.some(n => n.toLowerCase().includes(filters.niche!.toLowerCase()))) {
      return false;
    }
    if (filters.country && !publisher.country.toLowerCase().includes(filters.country.toLowerCase())) {
      return false;
    }
    if (filters.minDR && publisher.authority.dr < filters.minDR) {
      return false;
    }
    if (filters.maxDR && publisher.authority.dr > filters.maxDR) {
      return false;
    }
    if (filters.type && publisher.type !== filters.type) {
      return false;
    }
    return true;
  });
}

export async function browsePublishers({
  niche,
  country,
  minDR,
  maxDR,
  type,
  searchQuery,
}: {
  niche?: string;
  country?: string;
  minDR?: number;
  maxDR?: number;
  type?: string;
  searchQuery?: string;
}) {
  try {
    // Fetch data from API (with fallback)
    const allPublishers = await fetchPublishersFromAPI({
      niche,
      country,
      minDR,
      maxDR,
      type
    });

    // Apply filters
    let filteredPublishers = filterPublishers(allPublishers, {
      niche,
      country,
      minDR,
      maxDR,
      type
    });

    // Apply search query if provided
    if (searchQuery) {
      filteredPublishers = filteredPublishers.filter(publisher =>
        publisher.websiteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        publisher.website.toLowerCase().includes(searchQuery.toLowerCase()) ||
        publisher.niche.some(n => n.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Generate additional metadata using AI
    const { object: metadata } = await generateObject({
      model: openaiFlashModel,
      prompt: `Generate metadata for publishers browsing results. Found ${filteredPublishers.length} publishers matching the criteria.`,
      schema: z.object({
        totalCount: z.number().describe("Total number of publishers found"),
        averageDR: z.number().describe("Average Domain Rating"),
        averageDA: z.number().describe("Average Domain Authority"),
        priceRange: z.object({
          min: z.number().describe("Minimum price"),
          max: z.number().describe("Maximum price")
        }).describe("Price range of publishers"),
        topNiches: z.array(z.string()).describe("Top 3 niches by count"),
        summary: z.string().describe("Brief summary of the results")
      })
    });

    return {
      publishers: filteredPublishers,
      metadata,
      filters: {
        niche,
        country,
        minDR,
        maxDR,
        type,
        searchQuery
      }
    };
  } catch (error) {
    console.error('Error browsing publishers:', error);
    
    // Return fallback data with error info
    return {
      publishers: fallbackPublishersData,
      metadata: {
        totalCount: fallbackPublishersData.length,
        averageDR: 89,
        averageDA: 92,
        priceRange: { min: 380, max: 1500 },
        topNiches: ["Technology", "Health & Fitness", "Business"],
        summary: "Showing fallback publisher data due to API unavailability"
      },
      filters: {
        niche,
        country,
        minDR,
        maxDR,
        type,
        searchQuery
      },
      error: "API unavailable, showing cached data"
    };
  }
}

export async function getPublisherDetails(publisherId: string) {
  try {
    // In a real implementation, this would fetch from API
    const publisher = fallbackPublishersData.find(p => p.id === publisherId);
    
    if (!publisher) {
      throw new Error('Publisher not found');
    }

    // Generate additional details using AI
    const { object: details } = await generateObject({
      model: openaiFlashModel,
      prompt: `Generate detailed information for publisher ${publisher.websiteName}`,
      schema: z.object({
        description: z.string().describe("Brief description of the publisher"),
        targetAudience: z.string().describe("Primary target audience"),
        contentTypes: z.array(z.string()).describe("Types of content they publish"),
        contactInfo: z.object({
          email: z.string().optional(),
          website: z.string(),
          socialMedia: z.array(z.string()).optional()
        }).describe("Contact information"),
        requirements: z.array(z.string()).describe("Content requirements and guidelines"),
        turnaroundTime: z.string().describe("Typical turnaround time for content"),
        additionalNotes: z.string().describe("Additional notes about the publisher")
      })
    });

    return {
      ...publisher,
      details
    };
  } catch (error) {
    console.error('Error getting publisher details:', error);
    throw error;
  }
}
