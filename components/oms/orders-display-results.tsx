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
        '#10B981', // green for PAID
        '#F59E0B', // amber for PENDING
        '#EF4444', // red for FAILED
        '#6B7280', // gray for CANCELLED
        '#7C3AED', // violet accent for others
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
        backgroundColor: 'rgba(124, 58, 237, 0.12)',
        borderColor: '#7C3AED', // accent violet
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#7C3AED', // accent violet
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
        backgroundColor: '#7C3AED', // accent violet
        borderColor: '#7C3AED', // accent violet
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
            <div className="flex size-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <Package className="size-4 text-red-600 dark:text-red-400" />
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
      {/* Summary Cards - dark neutral with accent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="bg-card border border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center size-5 rounded-md bg-accent/15">
                  <Package className="size-3.5 text-accent" />
                </span>
                <span className="text-sm font-medium text-foreground">Orders</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{summary.totalOrders}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center size-5 rounded-md bg-accent/15">
                  <DollarSign className="size-3.5 text-accent" />
                </span>
                <span className="text-sm font-medium text-foreground">Total Value</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{formatCurrency(summary.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center size-5 rounded-md bg-accent/15">
                  <TrendingUp className="size-3.5 text-accent" />
                </span>
                <span className="text-sm font-medium text-foreground">Recent</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{summary.recentOrders}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center size-5 rounded-md bg-accent/15">
                  <CalendarDays className="size-3.5 text-accent" />
                </span>
                <span className="text-sm font-medium text-foreground">Status</span>
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
        <Card className="bg-card border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieChartIcon className="size-4" />
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
        <Card className="bg-card border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="size-4" />
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
      <Card className="bg-card border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4" />
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
      <Card className="bg-card border border-border w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4" />
            Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-6 text-center">
              <Package className="mx-auto size-8 text-gray-400" />
              <h3 className="mt-2 text-xs font-medium text-gray-900 dark:text-gray-100">No orders found</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                You haven&apos;t placed any orders yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {orders.map((order) => (
                <div key={order.id} className="p-4 border-b border-border last:border-b-0 hover:bg-surface-1/50 transition-colors">
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
                        className="h-6 px-2 text-xs border-accent/30 text-accent hover:bg-accent/10"
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
        <Card className="bg-accent/10 border-accent/30">
          <CardContent className="p-3">
            <p className="text-sm text-accent">{message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
