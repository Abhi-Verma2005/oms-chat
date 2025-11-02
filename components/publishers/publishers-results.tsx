"use client";

import { Star, ExternalLink, TrendingUp, Heart, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";

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
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  // Optimistic cart state - updates immediately for better UX
  const [optimisticCartItems, setOptimisticCartItems] = useState<Set<string>>(new Set(cartItems || []));

  // Sync optimistic state with actual cart items when they change
  useEffect(() => {
    if (cartItems) {
      setOptimisticCartItems(new Set(cartItems));
    }
  }, [cartItems]);

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
    const isInCart = optimisticCartItems.has(publisher.id);
    
    // Optimistically update UI immediately
    setOptimisticCartItems(prev => {
      const newSet = new Set(prev);
      if (isInCart) {
        newSet.delete(publisher.id);
      } else {
        newSet.add(publisher.id);
      }
      return newSet;
    });
    
    // Then update the actual cart
    if (isInCart) {
      onRemoveFromCart?.(publisher.id);
    } else {
      onAddToCart?.(publisher);
    }
  };

  const getSpamColor = (level: string) => {
    switch (level) {
      case "Low":
        return "bg-green-600 dark:bg-green-700 text-white";
      case "Medium":
        return "bg-yellow-500 dark:bg-yellow-600 text-gray-900 dark:text-white";
      case "High":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "Premium"
      ? "bg-primary text-primary-foreground"
      : "bg-muted text-muted-foreground";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "Rising":
        return <TrendingUp className="size-5 text-primary" />;
      case "Falling":
        return <TrendingUp className="size-5 text-destructive rotate-180" />;
      default:
        return <div className="size-5 bg-muted rounded-full" />;
    }
  };

  // Safety check
  if (!results.publishers || !Array.isArray(results.publishers)) {
    return (
      <div className="w-full p-6 bg-background text-foreground">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm font-medium">
            ⚠️ No publisher data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full space-y-6 p-6 bg-background text-foreground"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Error message */}
      {results.error && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-destructive text-sm font-medium">
            ⚠️ {results.error}
          </p>
        </div>
      )}

      {/* Filters applied */}
      {results.filters && Object.values(results.filters).some(Boolean) && (
        <div className="flex flex-wrap gap-2">
          {results.filters.niche && (
            <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold">
              Niche: {results.filters.niche}
            </span>
          )}
          {results.filters.country && (
            <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold">
              Country: {results.filters.country}
            </span>
          )}
          {results.filters.type && (
            <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold">
              Type: {results.filters.type}
            </span>
          )}
          {(results.filters.minDR || results.filters.maxDR) && (
            <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold">
              DR: {results.filters.minDR || 0}-{results.filters.maxDR || 100}
            </span>
          )}
        </div>
      )}

      {/* Publishers Table */}
      <div 
        className="rounded-lg overflow-hidden bg-card border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-foreground">
                  WEBSITE
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-foreground">
                  NICHE
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-foreground">
                  COUNTRY/LANG
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-foreground">
                  AUTHORITY
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-foreground">
                  SPAM
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-foreground">
                  PRICE
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-foreground">
                  TREND
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-foreground">
                  CART
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.publishers.map((publisher) => (
                <tr 
                  key={publisher.id} 
                  className="transition-all duration-150 bg-card hover:bg-muted/50"
                >
                  {/* Website Column */}
                  <td className="px-6 py-5">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`size-4 ${
                              i < publisher.rating
                                ? "text-yellow-400 fill-current"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-col space-y-2 min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold truncate text-foreground">
                            {publisher.websiteName}
                          </span>
                          <ExternalLink className="size-3.5 flex-shrink-0 text-primary" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {publisher.doFollow && (
                            <span 
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground"
                            >
                              <ExternalLink className="size-3 mr-1.5" />
                              Do-follow
                            </span>
                          )}
                          <span 
                            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground"
                          >
                            <ExternalLink className="size-3 mr-1.5" />
                            Outbound {publisher.outboundLinks}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Niche Column */}
                  <td className="px-6 py-5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {publisher.niche.map((n, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      <div 
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(publisher.type)}`}
                      >
                        Type: {publisher.type}
                      </div>
                    </div>
                  </td>

                  {/* Country/Lang Column */}
                  <td className="px-6 py-5">
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-sm font-semibold text-foreground">
                          {publisher.language}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        Country: {publisher.country}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        Language: {publisher.language}
                      </div>
                    </div>
                  </td>

                  {/* Authority Column */}
                  <td className="px-6 py-5">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-muted-foreground">DR</span>
                        <span 
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground"
                        >
                          {publisher.authority.dr}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-muted-foreground">DA</span>
                        <span 
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground"
                        >
                          {publisher.authority.da}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-muted-foreground">AS</span>
                        <span 
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground"
                        >
                          {publisher.authority.as}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Spam Column */}
                  <td className="px-6 py-5">
                    <span 
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${getSpamColor(publisher.spam.level)}`}
                    >
                      {publisher.spam.percentage}% {publisher.spam.level}
                    </span>
                  </td>

                  {/* Price Column */}
                  <td className="px-6 py-5">
                    <div className="space-y-1.5">
                      <div className="text-sm font-bold text-foreground">
                        ${publisher.pricing.base}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        Base: ${publisher.pricing.base}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        With Content: ${publisher.pricing.withContent}
                      </div>
                    </div>
                  </td>

                  {/* Trend Column */}
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(publisher.trend)}
                      <span className="text-sm font-semibold text-foreground">
                        {publisher.trend}
                      </span>
                    </div>
                  </td>

                  {/* Cart Column */}
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCart(publisher);
                        }}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                          optimisticCartItems.has(publisher.id)
                            ? "bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
                        }`}
                      >
                        <ShoppingCart className="size-3.5 mr-1.5" />
                        {optimisticCartItems.has(publisher.id) ? "In Cart" : "Add to Cart"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(publisher.id);
                        }}
                        className={`p-1.5 rounded-md transition-all duration-150 hover:bg-muted ${
                          wishlist.has(publisher.id) 
                            ? "text-destructive" 
                            : "text-muted-foreground"
                        }`}
                      >
                        <Heart
                          className={`size-4 ${
                            wishlist.has(publisher.id) ? "fill-current" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div 
        className="rounded-lg p-4 bg-card border border-border"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-6 flex-wrap">
            <span className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{results.metadata.totalCount}</span> publishers
            </span>
            <span className="text-sm text-muted-foreground">
              Avg DR: <span className="font-bold text-foreground">{results.metadata.averageDR}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              Avg DA: <span className="font-bold text-foreground">{results.metadata.averageDA}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              Price: <span className="font-bold text-foreground">${results.metadata.priceRange.min}-${results.metadata.priceRange.max}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
