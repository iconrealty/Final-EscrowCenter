import React from 'react';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color: string;
  trailColor?: string;
  label?: string;
  sublabel?: string;
  showPercent?: boolean;
  className?: string;
}

export function ProgressRing({
  size = 70,
  strokeWidth = 6,
  progress,
  color,
  trailColor = '#F0F4F6',
  label,
  sublabel,
  showPercent = true,
  className = "flex flex-col items-center justify-center p-2 flex-1"
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  // Dynamically calculate font size based on diameter
  const fontSize = Math.max(8, Math.round(size * 0.17));

  return (
    <div className={className}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            className="transition-all duration-300"
            stroke={trailColor}
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress circle */}
          <circle
            className="transition-all duration-500 ease-out"
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        {/* Percentage text centered inside the ring */}
        {showPercent && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="font-extrabold text-[#1d1d1f]"
              style={{ fontSize: `${fontSize}px` }}
            >
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-[11px] font-bold text-[#1d1d1f] mt-2 tracking-wide text-center">
          {label}
        </span>
      )}
      {sublabel && (
        <span className="text-[10px] font-medium text-[#86868b] mt-0.5 text-center">
          {sublabel}
        </span>
      )}
    </div>
  );
}

