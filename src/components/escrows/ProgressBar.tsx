import React from 'react';

export function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percentage = Math.round((completed / total) * 100);
  
  let color = '#ef4444'; // Red
  if (percentage >= 100) color = '#1B3A5C'; // Dark Navy Blue
  else if (percentage >= 60) color = '#1B3A5C'; // Dark Navy Blue
  else if (percentage >= 30) color = '#f59e0b'; // Amber

  return (
    <div className="flex items-center gap-3">
      <div className="text-xs font-semibold text-[#1d1d1f] w-16">Progress</div>
      <div className="flex-1 h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-500" 
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xs font-bold text-[#86868b] w-12 text-right">
        {percentage}%
      </div>
      <div className="text-[10px] text-[#86868b] w-8 text-right">
        {completed}/{total}
      </div>
    </div>
  );
}
