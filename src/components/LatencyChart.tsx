/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { MidiDevice } from '../types';
import { Activity, Zap, TrendingUp, AlertCircle, Clock } from 'lucide-react';

interface LatencyChartProps {
  device: MidiDevice;
}

export default function LatencyChart({ device }: LatencyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 160 });

  // Fallback if no history is present yet
  const history = device.latencyHistory || [device.latency];
  
  // Measure container dimensions dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setDimensions((prev) => ({
          ...prev,
          width: Math.max(width, 250),
        }));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const margin = { top: 15, right: 15, bottom: 20, left: 35 };
  const graphWidth = dimensions.width - margin.left - margin.right;
  const graphHeight = dimensions.height - margin.top - margin.bottom;

  // Prepare data points
  const data = history.map((val, idx) => ({ index: idx, value: val }));

  // Set up D3 scales
  const xScale = d3.scaleLinear()
    .domain([0, Math.max(history.length - 1, 1)])
    .range([0, graphWidth]);

  // Max value with some padding so spikes don't hit the absolute top
  const maxVal = d3.max(history) || 10;
  const yScale = d3.scaleLinear()
    .domain([0, Math.max(maxVal * 1.2, 12)]) // At least 12ms ceiling for visual scale
    .range([graphHeight, 0]);

  // Create the line generator
  const lineGenerator = d3.line<{ index: number; value: number }>()
    .x(d => xScale(d.index))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  const linePath = lineGenerator(data) || '';

  // Calculate statistics
  const avgLatency = history.length ? history.reduce((a, b) => a + b, 0) / history.length : 0;
  const peakLatency = Math.max(...history, 0);
  const minLatency = Math.min(...history, 0);
  
  // Jitter (average difference between consecutive latency samples)
  let totalJitter = 0;
  for (let i = 1; i < history.length; i++) {
    totalJitter += Math.abs(history[i] - history[i - 1]);
  }
  const jitterValue = history.length > 1 ? totalJitter / (history.length - 1) : 0;

  // Render horizontal grid lines
  const yTicks = yScale.ticks(4);

  return (
    <div 
      ref={containerRef}
      className="bg-black/40 rounded-xl border border-white/5 p-4 space-y-3.5"
      id={`latency-chart-${device.id}`}
    >
      {/* Title & Stats HUD */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-neon-cyan animate-pulse" />
          <span className="font-display font-semibold text-[11px] text-gray-200 uppercase tracking-wider">
            Real-Time Jitter &amp; Latency History
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-gray-500">Current:</span>
          <span className={`font-bold ${device.latency > 15 ? 'text-neon-red' : device.latency > 8 ? 'text-neon-yellow' : 'text-neon-green'}`}>
            {device.latency.toFixed(1)} ms
          </span>
        </div>
      </div>

      {/* SVG D3 Chart Canvas */}
      <div className="relative h-[160px] w-full bg-black/30 rounded-lg border border-white/[0.03] overflow-hidden">
        {/* CSS background subtle grid matching high-density theme */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:16px_16px]" />

        <svg width={dimensions.width} height={dimensions.height} className="overflow-visible select-none">
          <defs>
            {/* Gradient fill underneath the line path */}
            <linearGradient id={`area-grad-${device.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ff007f" stopOpacity="0" />
            </linearGradient>

            {/* Glowing line shadow */}
            <filter id="neon-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            
            {/* 1. Horizontal Y-axis Grid Lines & Labels */}
            {yTicks.map((tickVal) => {
              const yPos = yScale(tickVal);
              return (
                <g key={`y-tick-${tickVal}`} className="opacity-40 transition-all duration-300">
                  <line 
                    x1={0} 
                    y1={yPos} 
                    x2={graphWidth} 
                    y2={yPos} 
                    stroke="rgba(255, 255, 255, 0.08)" 
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text 
                    x={-8} 
                    y={yPos + 3.5} 
                    textAnchor="end" 
                    fill="rgba(255, 255, 255, 0.4)" 
                    className="font-mono text-[8px]"
                  >
                    {tickVal}ms
                  </text>
                </g>
              );
            })}

            {/* 2. Shaded area below the D3 line */}
            {data.length > 1 && (
              <path
                d={`
                  M ${xScale(0)} ${graphHeight}
                  L ${linePath.substring(1)}
                  L ${xScale(data.length - 1)} ${graphHeight}
                  Z
                `}
                fill={`url(#area-grad-${device.id})`}
                className="transition-all duration-300"
              />
            )}

            {/* 3. Glowing neon core path line */}
            <path
              d={linePath}
              fill="none"
              stroke="url(#cyan-magenta)"
              strokeWidth="2"
              className="transition-all duration-300"
              filter="url(#neon-glow-filter)"
            />

            {/* 4. Individual interactive data nodes + Spike indicator alerts */}
            {data.map((d, i) => {
              const cx = xScale(d.index);
              const cy = yScale(d.value);
              const isSpike = d.value > 10;
              const isLatest = i === data.length - 1;

              return (
                <g key={`dot-${i}`}>
                  {/* Latest node pulsing radar indicator */}
                  {isLatest && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="7"
                      fill={device.status === 'Error' ? '#ff3131' : '#00f0ff'}
                      className="animate-ping opacity-50"
                    />
                  )}

                  {/* Standard data points (only show points if less than 40 to avoid clutter, or if it is a spike) */}
                  {(data.length < 35 || isSpike || isLatest) && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSpike ? 3.5 : 2}
                      fill={isSpike ? '#ff3131' : '#00f0ff'}
                      stroke={isSpike ? 'rgba(255,255,255,0.8)' : 'rgba(10,10,15,0.9)'}
                      strokeWidth={isSpike ? 1 : 0.8}
                      className="transition-all duration-200 hover:scale-150"
                    />
                  )}

                  {/* Latency spike warning flag display directly on chart */}
                  {isSpike && (
                    <g transform={`translate(${cx}, ${cy - 10})`}>
                      <rect 
                        x="-18" 
                        y="-10" 
                        width="36" 
                        height="11" 
                        rx="2" 
                        fill="rgba(255, 49, 49, 0.9)" 
                        className="shadow"
                      />
                      <text 
                        textAnchor="middle" 
                        y="-2" 
                        fill="white" 
                        className="font-mono text-[7px] font-bold"
                      >
                        SPIKE
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Latency Metrics grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-black/30 rounded-lg p-2 border border-white/[0.03]">
          <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">
            Peak Latency
          </span>
          <span className="text-[11px] font-mono font-bold text-neon-magenta block mt-0.5">
            {peakLatency.toFixed(1)} ms
          </span>
        </div>

        <div className="bg-black/30 rounded-lg p-2 border border-white/[0.03]">
          <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">
            Average
          </span>
          <span className="text-[11px] font-mono font-bold text-gray-300 block mt-0.5">
            {avgLatency.toFixed(1)} ms
          </span>
        </div>

        <div className="bg-black/30 rounded-lg p-2 border border-white/[0.03]">
          <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">
            Min Floor
          </span>
          <span className="text-[11px] font-mono font-bold text-neon-green block mt-0.5">
            {minLatency.toFixed(1)} ms
          </span>
        </div>

        <div className="bg-black/30 rounded-lg p-2 border border-white/[0.03]">
          <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">
            Jitter Dev
          </span>
          <span className="text-[11px] font-mono font-bold text-[#f2ff00] block mt-0.5">
            ±{jitterValue.toFixed(2)} ms
          </span>
        </div>
      </div>
    </div>
  );
}
