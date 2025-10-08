import { CalendarDays, DollarSign, Package, TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import React, { useMemo } from "react";


import { OrderData, OrdersDisplayResult } from "@/ai/actions/orders-display";
import BarChart from "@/components/charts/bar-chart";
import LineChart from "@/components/charts/line-chart";
import PieChart from "@/components/charts/pie-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ChartData } from 'chart.js';
interface OrdersDisplayResultsProps {
  data: OrdersDisplayResult;
  success: boolean;
  error?: string;
  message?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-800 border-green-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "FAILED":
      return "bg-red-100 text-red-800 border-red-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
};

const formatCurrency = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount / 100); // Assuming amount is in cents
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function OrdersDisplayResults({ data, success, error, message }: OrdersDisplayResultsProps) {
  // Always destructure data to avoid conditional hook calls
  const { orders, summary } = data || { orders: [], summary: { totalOrders: 0, totalRevenue: 0, statusBreakdown: {} } };

  // Prepare chart data based on actual order data
  const statusChartData: ChartData<'pie'> = useMemo(() => ({
    labels: Object.keys(summary.statusBreakdown),
    datasets: [{
      data: Object.values(summary.statusBreakdown),
      backgroundColor: [
        '#00BCD4', // teal for PAID (using accent color)
        '#CE9178', // orange for PENDING (using string literal color)
        '#ef4444', // red for FAILED (keeping red)
        '#A0A0A0', // light gray for CANCELLED (using secondary text color)
        '#569CD6', // light blue for others (using SQL function color)
      ],
      borderWidth: 0,
    }]
  }), [summary.statusBreakdown]);

  // Process actual order data for monthly trends
  const monthlyData = useMemo(() => {
    // Group orders by month
    const monthlyRevenue: Record<string, number> = {};
    const monthlyCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + order.totalAmount;
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });

    // Get last 6 months
    const months = [];
    const values = [];
    const counts = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      
      months.push(monthKey);
      values.push(monthlyRevenue[monthKey] || 0);
      counts.push(monthlyCounts[monthKey] || 0);
    }
    
    return {
      labels: months,
      datasets: [{
        label: 'Revenue',
        data: values,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderColor: '#00BCD4', // teal accent color
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00BCD4', // teal accent color
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    };
  }, [orders]);

  // Prepare order count by month using actual data
  const orderCountData: ChartData<'bar'> = useMemo(() => {
    const monthlyCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });

    // Get last 6 months
    const months = [];
    const counts = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      
      months.push(monthKey);
      counts.push(monthlyCounts[monthKey] || 0);
    }

    return {
      labels: months,
      datasets: [{
        label: 'Orders',
        data: counts,
        backgroundColor: '#00BCD4', // teal accent color
        borderColor: '#00BCD4', // teal accent color
        borderWidth: 0,
      }]
    };
  }, [orders]);

  // Early return after all hooks
  if (!success) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <Package className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-red-800 dark:text-red-200">Error Loading Orders</h3>
              <p className="text-xs text-red-600 dark:text-red-300">
                {error || "Failed to load your orders. Please try again."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full p-4">
      {/* Compact Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Orders</span>
              </div>
              <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{summary.totalOrders}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border-green-200 dark:border-green-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Total Value</span>
              </div>
              <span className="text-sm font-bold text-green-800 dark:text-green-200">
                {formatCurrency(summary.totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950 dark:to-violet-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Recent</span>
              </div>
              <span className="text-sm font-bold text-purple-800 dark:text-purple-200">{summary.recentOrders}</span>
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Last 30 days</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950 dark:to-amber-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Status</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(summary.statusBreakdown).map(([status, count]) => (
                <Badge key={status} className={`text-xs px-2 py-1 ${getStatusColor(status)}`}>
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order Status Distribution */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieChartIcon className="h-4 w-4" />
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div style={{ height: '200px' }}>
              <PieChart data={statusChartData} width={300} height={200} />
            </div>
          </CardContent>
        </Card>

        {/* Monthly Order Count */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Monthly Order Count
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div style={{ height: '200px' }}>
              <BarChart data={orderCountData} width={300} height={200} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Revenue Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div style={{ height: '250px' }}>
            <LineChart data={monthlyData} width={400} height={250} />
          </div>
        </CardContent>
      </Card>

      {/* Compact Orders List */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-6 text-center">
              <Package className="mx-auto h-8 w-8 text-gray-400" />
              <h3 className="mt-2 text-xs font-medium text-gray-900 dark:text-gray-100">No orders found</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                You haven&apos;t placed any orders yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {orders.map((order) => (
                <div key={order.id} className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-xs text-gray-900 dark:text-gray-100">
                          #{order.id.slice(-8)}
                        </h4>
                        <Badge className={`text-xs px-2 py-1 ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                      </div>
                      <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                        {formatCurrency(order.totalAmount, order.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(order.createdAt)}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compact Message */}
      {message && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">{message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
