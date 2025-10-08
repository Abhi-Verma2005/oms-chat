// Import Chart.js
import { Chart, Tooltip } from 'chart.js'

import { adjustColorOpacity, getCssVariable } from '@/lib/utils'

Chart.register(Tooltip)

// Define Chart.js default settings
Chart.defaults.font.family = '"Inter", sans-serif'
Chart.defaults.font.weight = 500
Chart.defaults.plugins.tooltip.borderWidth = 1
Chart.defaults.plugins.tooltip.displayColors = false
Chart.defaults.plugins.tooltip.mode = 'nearest'
Chart.defaults.plugins.tooltip.intersect = false
Chart.defaults.plugins.tooltip.position = 'nearest'
Chart.defaults.plugins.tooltip.caretSize = 0
Chart.defaults.plugins.tooltip.caretPadding = 20
Chart.defaults.plugins.tooltip.cornerRadius = 8
Chart.defaults.plugins.tooltip.padding = 8

interface ChartArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface ColorStop {
  stop: number;
  color: string;
}

// Function that generates a gradient for line charts
export const chartAreaGradient = (
  ctx: CanvasRenderingContext2D | null,
  chartArea: ChartArea | null,
  colorStops: ColorStop[] | null
): CanvasGradient | string | null => {
  if (!ctx || !chartArea || !colorStops || colorStops.length === 0) {
    return 'transparent';
  }
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  colorStops.forEach(({ stop, color }) => {
    gradient.addColorStop(stop, color);
  });
  return gradient;
};

export const chartColors = {
  textColor: {
    light: '#737373', // medium gray for light mode
    dark: '#a0a0a0' // #A0A0A0 - light gray from screenshot
  },  
  gridColor: {
    light: '#f5f5f5', // very light gray
    dark: 'rgba(45, 45, 45, 0.6)' // #2D2D2D with opacity
  },
  backdropColor: {
    light: '#ffffff', // pure white
    dark: '#141414' // #141414 - deep dark gray main background
  },
  tooltipTitleColor: {
    light: '#1e1e1e', // dark text
    dark: '#ffffff' // white text
  },
  tooltipBodyColor: {
    light: '#737373', // medium gray
    dark: '#a0a0a0' // light gray
  },
  tooltipBgColor: {
    light: '#ffffff', // pure white
    dark: '#1f1f1f' // #1F1F1F - dark gray card background
  },
  tooltipBorderColor: {
    light: '#e5e5e5', // light border
    dark: '#404040' // dark border
  },
};



