"use client";

import { Star, ExternalLink, TrendingUp, Heart, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";

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
    const isInCart = cartItems?.has(publisher.id) || false;
    
    if (isInCart) {
      onRemoveFromCart?.(publisher.id);
    } else {
      onAddToCart?.(publisher);
    }
  };

  const getSpamColor = (level: string) => {
    switch (level) {
      case "Low":
        return "bg-status-success text-white";
      case "Medium":
        return "bg-status-pending text-white";
      case "High":
        return "bg-status-failed text-white";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "Premium"
      ? "bg-primary/15 text-primary"
      : "bg-muted text-muted-foreground";
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

  // Safety check
  if (!results.publishers || !Array.isArray(results.publishers)) {
    return (
      <div className="w-full p-8 text-foreground">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <p className="text-yellow-800 dark:text-yellow-300 text-sm font-medium">
            ⚠️ No publisher data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full space-y-8 p-8 text-foreground"
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
        <div className="flex flex-wrap gap-4">
          {results.filters.niche && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-full text-xs font-semibold">
              Niche: {results.filters.niche}
            </span>
          )}
          {results.filters.country && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-full text-xs font-semibold">
              Country: {results.filters.country}
            </span>
          )}
          {results.filters.type && (
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-4 py-2 rounded-full text-xs font-semibold">
              Type: {results.filters.type}
            </span>
          )}
          {(results.filters.minDR || results.filters.maxDR) && (
            <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 px-4 py-2 rounded-full text-xs font-semibold">
              DR: {results.filters.minDR || 0}-{results.filters.maxDR || 100}
            </span>
          )}
        </div>
      )}

      {/* Publishers Table */}
      <div 
        className="bg-card rounded-xl shadow-lg border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-8 py-6 text-left text-xs font-bold text-foreground uppercase tracking-wide">
                  WEBSITE
                </th>
                <th className="px-8 py-6 text-left text-xs font-bold text-foreground uppercase tracking-wide">
                  NICHE
                </th>
                <th className="px-8 py-6 text-left text-xs font-bold text-foreground uppercase tracking-wide">
                  COUNTRY/LANG
                </th>
                <th className="px-8 py-6 text-left text-xs font-bold text-foreground uppercase tracking-wide">
                  AUTHORITY
                </th>
                <th className="px-8 py-6 text-left text-xs font-bold text-foreground uppercase tracking-wide">
                  SPAM
                </th>
                <th className="px-8 py-6 text-left text-xs font-bold text-foreground uppercase tracking-wide">
                  PRICE
                </th>
                <th className="px-8 py-6 text-left text-xs font-bold text-foreground uppercase tracking-wide">
                  TREND
                </th>
                <th className="px-8 py-6 text-left text-xs font-bold text-foreground uppercase tracking-wide">
                  CART
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {results.publishers.map((publisher) => (
                <tr key={publisher.id} className="hover:bg-muted/30 transition-all duration-200">
                  {/* Website Column */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`size-5 ${
                              i < publisher.rating
                                ? "text-yellow-400 fill-current"
                                : "text-muted-foreground/40"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-semibold text-foreground truncate max-w-[250px]">
                            {publisher.websiteName}
                          </span>
                          <ExternalLink className="size-4 text-muted-foreground" />
                        </div>
                        <div className="flex space-x-3">
                          {publisher.doFollow && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-ui-teal/20 text-ui-teal">
                              <ExternalLink className="size-4 mr-1.5" />
                              Do-follow
                            </span>
                          )}
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            <ExternalLink className="size-4 mr-1.5" />
                            Outbound {publisher.outboundLinks}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Niche Column */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {publisher.niche.map((n, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getTypeColor(publisher.type)}`}>
                        Type: {publisher.type}
                      </div>
                    </div>
                  </td>

                  {/* Country/Lang Column */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-semibold text-foreground">
                          {publisher.language}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        Country: {publisher.country}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        Language: {publisher.language}
                      </div>
                    </div>
                  </td>

                  {/* Authority Column */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-semibold text-muted-foreground">DR</span>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-authority-dr text-white">
                          {publisher.authority.dr}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-semibold text-muted-foreground">DA</span>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-authority-da text-white">
                          {publisher.authority.da}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-semibold text-muted-foreground">AS</span>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-authority-as text-white">
                          {publisher.authority.as}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Spam Column */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-bold ${getSpamColor(publisher.spam.level)}`}>
                      {publisher.spam.percentage}% {publisher.spam.level}
                    </span>
                  </td>

                  {/* Price Column */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-foreground">
                        ${publisher.pricing.base}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        Base: ${publisher.pricing.base}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        With Content: ${publisher.pricing.withContent}
                      </div>
                    </div>
                  </td>

                  {/* Trend Column */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      {getTrendIcon(publisher.trend)}
                      <span className="text-sm font-semibold text-foreground">
                        {publisher.trend}
                      </span>
                    </div>
                  </td>

                  {/* Cart Column */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <Button
                        size="default"
                        variant={cartItems?.has(publisher.id) ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCart(publisher);
                        }}
                        className={`text-xs font-semibold px-4 py-2 ${
                          cartItems?.has(publisher.id) 
                            ? "bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700" 
                            : "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700"
                        }`}
                      >
                        <ShoppingCart className="size-4 mr-2" />
                        {cartItems?.has(publisher.id) ? "In Cart" : "Add to Cart"}
                      </Button>
                      <Button
                        size="default"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(publisher.id);
                        }}
                        className="p-2"
                      >
                        <Heart
                          className={`size-5 ${
                            wishlist.has(publisher.id)
                              ? "text-status-failed fill-current"
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
