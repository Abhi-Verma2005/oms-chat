"use client";

import { Star, ExternalLink, TrendingUp, Heart, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/contexts/cart-context";

import { Button } from "../ui/button";

interface PublisherData {
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

interface PublishersResultsProps {
  results: {
    publishers: PublisherData[];
    metadata: {
      totalCount: number;
      averageDR: number;
      averageDA: number;
      priceRange: { min: number; max: number };
      topNiches: string[];
      summary: string;
    };
    filters?: {
      niche?: string;
      country?: string;
      minDR?: number;
      maxDR?: number;
      type?: string;
      searchQuery?: string;
    };
    error?: string;
  };
  onAddToCart?: (publisher: PublisherData) => void;
  onRemoveFromCart?: (publisherId: string) => void;
  cartItems?: Set<string>;
}

export function PublishersResults({ results, onAddToCart, onRemoveFromCart, cartItems }: PublishersResultsProps) {
  // Subscribe to cart context for optimistic UI updates
  const { addItem, removeItem, isItemInCart } = useCart();
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const toggleWishlist = (publisherId: string) => {
    setWishlist(prev => {
      const newSet = new Set(prev);
      if (newSet.has(publisherId)) {
        newSet.delete(publisherId);
      } else {
        newSet.add(publisherId);
      }
      return newSet;
    });
  };

  const toggleCart = (publisher: PublisherData) => {
    const inCart = isItemInCart(publisher.id);
    // Optimistic update via context
    if (inCart) {
      removeItem(publisher.id);
      onRemoveFromCart?.(publisher.id);
    } else {
      addItem({
        id: publisher.id,
        type: "publisher",
        name: publisher.websiteName,
        price: publisher.pricing.base,
        quantity: 1,
        addedAt: new Date(),
        metadata: {
          publisherId: publisher.id,
          website: publisher.website,
          niche: publisher.niche,
          dr: publisher.authority.dr,
          da: publisher.authority.da,
        },
      });
      onAddToCart?.(publisher);
    }
  };

  const getSpamColor = (level: string) => {
    switch (level) {
      case "Low":
        return "bg-green-500/15 text-green-400 border border-green-500/30";
      case "Medium":
        return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30";
      case "High":
        return "bg-red-500/15 text-red-400 border border-red-500/30";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "Premium"
      ? "bg-accent/10 text-accent border border-accent/20"
      : "bg-muted text-muted-foreground border border-border";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "Rising":
        return <TrendingUp className="size-5 text-ui-teal" />;
      case "Falling":
        return <TrendingUp className="size-5 text-status-failed rotate-180" />;
      default:
        return <div className="size-5 bg-muted rounded-full" />;
    }
  };

  return (
    <div 
      className="w-full space-y-6 p-6 text-foreground"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Error message */}
      {results.error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <p className="text-yellow-800 dark:text-yellow-300 text-sm font-medium">
            ⚠️ {results.error}
          </p>
        </div>
      )}

      {/* Filters applied */}
      {results.filters && Object.values(results.filters).some(Boolean) && (
        <div className="flex flex-wrap gap-2">
          {results.filters.niche && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-1 border border-border text-text-secondary">Niche: {results.filters.niche}</span>
          )}
          {results.filters.country && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-1 border border-border text-text-secondary">Country: {results.filters.country}</span>
          )}
          {results.filters.type && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-1 border border-border text-text-secondary">Type: {results.filters.type}</span>
          )}
          {(results.filters.minDR || results.filters.maxDR) && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-1 border border-border text-text-secondary">DR: {results.filters.minDR || 0}-{results.filters.maxDR || 100}</span>
          )}
        </div>
      )}

      {/* Publishers Table */}
      <div 
        className="relative bg-card rounded-lg border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle accent blur strip behind header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-r from-accent/15 via-transparent to-accent/15 blur-xl" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-1/60">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  WEBSITE
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  NICHE
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  COUNTRY/LANG
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  AUTHORITY
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  SPAM
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  PRICE
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  TREND
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide sticky right-0 z-10 bg-surface-1/80 backdrop-blur supports-[backdrop-filter]:bg-surface-1/60 border-l border-border">
                  CART
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {results.publishers.map((publisher) => (
                <tr key={publisher.id} className="group relative hover:bg-surface-1 transition-colors">
                  {/* Website Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Left accent indicator on hover */}
                    <span className="pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            strokeWidth={1.5}
                            className="size-4 text-foreground/70"
                          />
                        ))}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate max-w-[240px]">
                            {publisher.websiteName}
                          </span>
                          <ExternalLink className="size-3 text-muted-foreground" />
                        </div>
                        <div className="flex gap-2">
                          {publisher.doFollow && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-ui-teal/15 text-ui-teal border border-ui-teal/30 backdrop-blur-[2px]">
                              <ExternalLink className="size-3 mr-1" />
                              Do-follow
                            </span>
                          )}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-1/80 border border-border text-text-secondary backdrop-blur-[2px]">
                            <ExternalLink className="size-3 mr-1" />
                            Outbound {publisher.outboundLinks}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Niche Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {publisher.niche.map((n, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-1/80 border border-border text-text-secondary backdrop-blur-[2px]"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-[2px] ${getTypeColor(publisher.type)}`}>
                        Type: {publisher.type}
                      </div>
                    </div>
                  </td>

                  {/* Country/Lang Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {publisher.language}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Country: {publisher.country}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Language: {publisher.language}
                      </div>
                    </div>
                  </td>

                  {/* Authority Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-secondary">DR</span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-1 border border-border text-foreground">
                          {publisher.authority.dr}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-secondary">DA</span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-1 border border-border text-foreground">
                          {publisher.authority.da}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-secondary">AS</span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-1 border border-border text-foreground">
                          {publisher.authority.as}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Spam Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-[2px] ${getSpamColor(publisher.spam.level)}`}>
                      {publisher.spam.percentage}% {publisher.spam.level}
                    </span>
                  </td>

                  {/* Price Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">${publisher.pricing.base}</div>
                      <div className="text-[11px] text-muted-foreground">Base • ${publisher.pricing.base}</div>
                      <div className="text-[11px] text-muted-foreground">With Content • ${publisher.pricing.withContent}</div>
                    </div>
                  </td>

                  {/* Trend Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(publisher.trend)}
                      <span className="text-sm font-medium text-foreground">
                        {publisher.trend}
                      </span>
                    </div>
                  </td>

                  {/* Cart Column */}
                  <td className="px-6 py-4 whitespace-nowrap sticky right-0 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70 border-l border-border z-[5]">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isItemInCart(publisher.id) ? "secondary" : "default"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCart(publisher);
                        }}
                        className={`text-xs font-medium transition-all duration-200 active:scale-[0.98] ${
                          isItemInCart(publisher.id)
                            ? "bg-surface-0 border border-border text-text-primary hover:bg-surface-1 shadow-[0_1px_0_rgba(0,0,0,0.2)]" 
                            : "bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white shadow-[0_6px_18px_rgba(37,99,235,0.20)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.28)] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50"
                        }`}
                      >
                        <ShoppingCart className="size-4 mr-1.5 transition-transform group-hover:scale-110" />
                        {isItemInCart(publisher.id) ? "In Cart" : "Add to Cart"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(publisher.id);
                        }}
                        className="p-2 hover:bg-surface-1"
                      >
                        <Heart
                          className={`size-5 ${
                            wishlist.has(publisher.id)
                              ? "text-danger fill-current"
                              : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-muted/50 rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <span className="text-muted-foreground text-sm">
              <span className="font-bold text-foreground text-sm">{results.metadata.totalCount}</span> publishers
            </span>
            <span className="text-muted-foreground text-sm">
              Avg DR: <span className="font-bold text-foreground">{results.metadata.averageDR}</span>
            </span>
            <span className="text-muted-foreground text-sm">
              Avg DA: <span className="font-bold text-foreground">{results.metadata.averageDA}</span>
            </span>
            <span className="text-muted-foreground text-sm">
              Price: <span className="font-bold text-foreground">${results.metadata.priceRange.min}-${results.metadata.priceRange.max}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
