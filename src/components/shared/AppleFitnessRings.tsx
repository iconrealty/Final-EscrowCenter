import React from 'react';
import { motion } from 'motion/react';

export interface RingData {
  label: string;
  progress: number; // 0 to 100
  color: string;
  bgColor: string;
  valueText: string;
}

interface AppleFitnessRingsProps {
  rings: RingData[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
}

export function AppleFitnessRings({
  rings,
  size = 92,
  strokeWidth = 6.5,
  gap = 1.5,
}: AppleFitnessRingsProps) {
  const center = size / 2;

  return (
    <div className="flex flex-row items-center gap-5 p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl shadow-sm relative overflow-hidden group/pod">
      {/* Dynamic atmospheric subtle glow background corresponding to the hover of the rings */}
      <div className="absolute inset-0 bg-radial from-[#1B3A5C]/5 via-transparent to-transparent opacity-40 pointer-events-none transition-opacity duration-500 group-hover/pod:opacity-75" />
      
      {/* Concentric rings wrapper */}
      <div className="relative shrink-0 flex items-center justify-center filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.08)]" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90 select-none overflow-visible">
          {rings.map((ring, idx) => {
            const radius = center - (strokeWidth / 2) - idx * (strokeWidth + gap);
            const circumference = radius * 2 * Math.PI;
            const progressValue = Math.min(100, Math.max(0, ring.progress));
            
            // Calculate offset. If progress is 0, offset is equal to circumference.
            // If progress is 100, offset is 0.
            const strokeDashoffset = circumference - (progressValue / 100) * circumference;

            return (
              <g key={ring.label}>
                {/* Background track circle */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={ring.bgColor}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  className="opacity-15"
                />
                
                {/* Active progress circle */}
                <motion.circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: idx * 0.15 }}
                  strokeLinecap="round"
                  style={{
                    transformOrigin: 'center',
                  }}
                />

                {/* Overlap Tip Shadow Effect to simulate the 3D Apple Watch ring overlap */}
                {progressValue > 95 && (
                  <circle
                    cx={center + radius}
                    cy={center}
                    r={strokeWidth / 2}
                    fill={ring.color}
                    className="shadow-sm"
                    style={{
                      transform: `rotate(${(progressValue / 100) * 360}deg)`,
                      transformOrigin: 'center',
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Center icon or label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[14px] font-extrabold text-[#1d1d1f] font-mono leading-none">
            {Math.round(rings[0]?.progress || 0)}%
          </span>
        </div>
      </div>

      {/* Grid Legend Column */}
      <div className="flex-1 flex flex-col gap-3.5 w-full">
        {rings.map((ring) => {
          return (
            <div 
              key={ring.label} 
              className="flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-white transition-all duration-200 group/item"
            >
              {/* Name */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider transition-colors">
                  {ring.label}
                </span>
                <span className="text-sm font-extrabold font-mono leading-tight" style={{ color: ring.color }}>
                  {ring.valueText} Completed
                </span>
              </div>

              {/* Right text metrics */}
              <div className="text-right flex flex-col items-end">
                <span 
                  className="font-mono text-xs font-extrabold"
                  style={{ color: ring.color }}
                >
                  {Math.round(ring.progress)}%
                </span>
                
                {/* Small indicator bar */}
                <div className="w-10 h-1 bg-[#e2e8f0] rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${ring.progress}%`, 
                      backgroundColor: ring.color,
                      boxShadow: `0 0 2px ${ring.color}` 
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
