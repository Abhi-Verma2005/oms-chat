"use client";

import { Star, ExternalLink, TrendingUp, Heart, ShoppingCart } from "lucide-react";
import { useState } from "react";

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
}

export function PublishersResults({ results }: PublishersResultsProps) {
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Set<string>>(new Set());

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

  const toggleCart = (publisherId: string) => {
    setCart(prev => {
      const newSet = new Set(prev);
      if (newSet.has(publisherId)) {
        newSet.delete(publisherId);
      } else {
        newSet.add(publisherId);
      }
      return newSet;
    });
  };

  const getSpamColor = (level: string) => {
    switch (level) {
      case "Low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "High": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "Premium" 
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "Rising": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "Falling": return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default: return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Error message */}
      {results.error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-yellow-800 dark:text-yellow-300 text-sm">
            ⚠️ {results.error}
          </p>
        </div>
      )}

      {/* Filters applied */}
      {results.filters && Object.values(results.filters).some(Boolean) && (
        <div className="flex flex-wrap gap-3">
          {results.filters.niche && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-full text-xs font-medium">
              Niche: {results.filters.niche}
            </span>
          )}
          {results.filters.country && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-full text-xs font-medium">
              Country: {results.filters.country}
            </span>
          )}
          {results.filters.type && (
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-3 py-2 rounded-full text-xs font-medium">
              Type: {results.filters.type}
            </span>
          )}
          {(results.filters.minDR || results.filters.maxDR) && (
            <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 px-3 py-2 rounded-full text-xs font-medium">
              DR: {results.filters.minDR || 0}-{results.filters.maxDR || 100}
            </span>
          )}
        </div>
      )}

      {/* Publishers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  WEBSITE
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  NICHE
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  COUNTRY/LANG
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  AUTHORITY
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  SPAM
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  PRICE
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  TREND
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  CART
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
              {results.publishers.map((publisher) => (
                <tr key={publisher.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  {/* Website Column */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < publisher.rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                            {publisher.websiteName}
                          </span>
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </div>
                        <div className="flex space-x-2">
                          {publisher.doFollow && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Do-follow
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Outbound {publisher.outboundLinks}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Niche Column */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {publisher.niche.map((n, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(publisher.type)}`}>
                        Type: {publisher.type}
                      </div>
                    </div>
                  </td>

                  {/* Country/Lang Column */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {publisher.language}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Country: {publisher.country}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Language: {publisher.language}
                      </div>
                    </div>
                  </td>

                  {/* Authority Column */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">DR</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                          {publisher.authority.dr}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">DA</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {publisher.authority.da}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">AS</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                          {publisher.authority.as}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Spam Column */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSpamColor(publisher.spam.level)}`}>
                      {publisher.spam.percentage}% {publisher.spam.level}
                    </span>
                  </td>

                  {/* Price Column */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ${publisher.pricing.base}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Base: ${publisher.pricing.base}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        With Content: ${publisher.pricing.withContent}
                      </div>
                    </div>
                  </td>

                  {/* Trend Column */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(publisher.trend)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {publisher.trend}
                      </span>
                    </div>
                  </td>

                  {/* Cart Column */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant={cart.has(publisher.id) ? "default" : "outline"}
                        onClick={() => toggleCart(publisher.id)}
                        className="text-xs"
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {cart.has(publisher.id) ? "In Cart" : "Add to Cart"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleWishlist(publisher.id)}
                        className="p-1"
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            wishlist.has(publisher.id)
                              ? "text-red-500 fill-current"
                              : "text-gray-400"
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
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{results.metadata.totalCount}</span> publishers
            </span>
            <span className="text-gray-600 dark:text-gray-300">
              Avg DR: <span className="font-semibold">{results.metadata.averageDR}</span>
            </span>
            <span className="text-gray-600 dark:text-gray-300">
              Avg DA: <span className="font-semibold">{results.metadata.averageDA}</span>
            </span>
            <span className="text-gray-600 dark:text-gray-300">
              Price: <span className="font-semibold">${results.metadata.priceRange.min}-${results.metadata.priceRange.max}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
