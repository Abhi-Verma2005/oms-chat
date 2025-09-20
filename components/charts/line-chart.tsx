'use client'

import { useRef, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

import { chartColors, chartAreaGradient } from '@/components/charts/chartjs-config'
import {
  Chart, LineController, LineElement, Filler, PointElement, LinearScale, CategoryScale, Tooltip,
} from 'chart.js'
import type { ChartData } from 'chart.js'

// Import utilities
import { adjustColorOpacity, getCssVariable, formatValue } from '@/lib/utils'

Chart.register(LineController, LineElement, Filler, PointElement, LinearScale, CategoryScale, Tooltip)

interface LineChartProps {
  data: ChartData
  width: number
  height: number
}

export default function LineChart({
  data,
  width,
  height
}: LineChartProps) {

  const [chart, setChart] = useState<Chart | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const chartValue = useRef<HTMLSpanElement>(null)
  const chartDeviation = useRef<HTMLDivElement>(null)  
  const { theme } = useTheme()
  const darkMode = theme === 'dark'
  const { textColor, gridColor, tooltipTitleColor, tooltipBodyColor, tooltipBgColor, tooltipBorderColor } = chartColors

  useEffect(() => {
    const ctx = canvas.current
    if (!ctx) return

    const newChart = new Chart(ctx, {
      type: 'line',
      data: data,
      options: {
        layout: {
          padding: 20,
        },
        scales: {
          y: {
            border: {
              display: false,
            },
            suggestedMin: 30,
            suggestedMax: 80,
            ticks: {
              maxTicksLimit: 5,
              callback: (value) => formatValue(+value),
              color: darkMode ? textColor.dark : textColor.light,
            },
            grid: {
              color: darkMode ? gridColor.dark : gridColor.light,
            },   
          },
          x: {
            type: 'category',
            border: {
              display: false,
            },
            grid: {
              display: false,
            },
            ticks: {
              autoSkipPadding: 48,
              maxRotation: 0,
              color: darkMode ? textColor.dark : textColor.light,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            titleColor: darkMode ? tooltipTitleColor.dark : tooltipTitleColor.light,
            bodyColor: darkMode ? tooltipBodyColor.dark : tooltipBodyColor.light,
            backgroundColor: darkMode ? tooltipBgColor.dark : tooltipBgColor.light,
            borderColor: darkMode ? tooltipBorderColor.dark : tooltipBorderColor.light,
          },          
        },
        interaction: {
          intersect: false,
          mode: 'nearest',
        },
        animation: {
          duration: 200,
        },
        maintainAspectRatio: false,
      },
      plugins: [{
        id: 'htmlLegend',
        afterUpdate(c, args, options) {
          const chartValueEl = chartValue.current
          const chartDeviationEl = chartDeviation.current
          if (!chartValueEl || !chartDeviationEl) return
          
          const points = c.data.datasets[0].data
          const lastPoint = points[points.length - 1]
          const prevPoint = points[points.length - 2]
          
          if (typeof lastPoint === 'number') {
            chartValueEl.textContent = formatValue(lastPoint)
            
            if (prevPoint && typeof prevPoint === 'number' && prevPoint > 0) {
              const diff = lastPoint - prevPoint
              const diffPercent = (diff / prevPoint) * 100
              chartDeviationEl.textContent = `${diff >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%`
              chartDeviationEl.className = `inline-flex items-center text-xs font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`
            } else {
              chartDeviationEl.textContent = '+0%'
              chartDeviationEl.className = 'inline-flex items-center text-xs font-medium text-gray-500'
            }
          }
        },
      }],
    })
    setChart(newChart)
    return () => newChart.destroy()
  }, [])

  useEffect(() => {
    if (!chart) return

    if (darkMode) {
      chart.options.scales!.y!.ticks!.color = textColor.dark
      chart.options.scales!.y!.grid!.color = gridColor.dark
      chart.options.scales!.x!.ticks!.color = textColor.dark
      chart.options.plugins!.tooltip!.titleColor = tooltipTitleColor.dark
      chart.options.plugins!.tooltip!.bodyColor = tooltipBodyColor.dark
      chart.options.plugins!.tooltip!.backgroundColor = tooltipBgColor.dark
      chart.options.plugins!.tooltip!.borderColor = tooltipBorderColor.dark
    } else {
      chart.options.scales!.y!.ticks!.color = textColor.light
      chart.options.scales!.y!.grid!.color = gridColor.light
      chart.options.scales!.x!.ticks!.color = textColor.light
      chart.options.plugins!.tooltip!.titleColor = tooltipTitleColor.light
      chart.options.plugins!.tooltip!.bodyColor = tooltipBodyColor.light
      chart.options.plugins!.tooltip!.backgroundColor = tooltipBgColor.light
      chart.options.plugins!.tooltip!.borderColor = tooltipBorderColor.light
    }
    chart.update('none')
  }, [theme])    

  return (
    <div className="grow flex flex-col">
      <div className="flex-shrink-0 px-2 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <span ref={chartValue} className="text-2xl font-bold text-gray-900 dark:text-gray-100">$0</span>
            <span ref={chartDeviation} className="inline-flex items-center text-xs font-medium text-green-600 ml-2">+0%</span>
          </div>
        </div>
      </div>
      <div className="flex-1" style={{ height: `${height * 0.8}px` }}>
        <canvas ref={canvas} width={width} height={height}></canvas>
      </div>
    </div>
  )
}
