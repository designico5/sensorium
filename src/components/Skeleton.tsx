/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  variant = 'rectangular',
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-white/5 border border-white/10 rounded';
  
  const variantClasses = {
    text: 'rounded h-3',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: '',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

// Pre-built skeleton components for common UI patterns
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-4 p-4 bg-void-panel/50 border border-white/10 rounded-xl ${className}`} aria-hidden="true">
    <div className="flex items-center gap-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="60%" />
      </div>
    </div>
    <Skeleton variant="rectangular" width="100%" height={120} />
    <div className="flex gap-2">
      <Skeleton variant="text" width={80} height={32} />
      <Skeleton variant="text" width={80} height={32} />
      <Skeleton variant="text" width={80} height={32} />
    </div>
  </div>
);

export const DeviceCardSkeleton: React.FC = () => (
  <div className="p-4 bg-void-panel/50 border border-white/10 rounded-xl space-y-3" aria-hidden="true">
    <div className="flex items-center justify-between">
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="circular" width={12} height={12} />
    </div>
    <Skeleton variant="text" width="40%" height={14} />
    <div className="grid grid-cols-3 gap-2">
      <Skeleton variant="rectangular" height={30} />
      <Skeleton variant="rectangular" height={30} />
      <Skeleton variant="rectangular" height={30} />
    </div>
    <div className="flex gap-2">
      <Skeleton variant="rectangular" width={80} height={28} />
      <Skeleton variant="rectangular" width={80} height={28} />
    </div>
  </div>
);

export const ChartSkeleton: React.FC<{ height?: number; className?: string }> = ({ 
  height = 200, 
  className = '' 
}) => (
  <div className={`bg-void-panel/50 border border-white/10 rounded-xl p-4 ${className}`} aria-hidden="true">
    <div className="flex items-center justify-between mb-4">
      <Skeleton variant="text" width="30%" height={18} />
      <Skeleton variant="text" width="20%" height={14} />
    </div>
    <div style={{ height }} className="flex items-end justify-between gap-1">
      {[...Array(12)].map((_, i) => (
        <Skeleton 
          key={i} 
          variant="rectangular" 
          width="100%" 
          height={Math.max(20, Math.random() * height * 0.8)} 
          animation="wave"
        />
      ))}
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-void-panel/50 border border-white/10 rounded-xl overflow-hidden" aria-hidden="true">
    <div className="grid grid-cols-{columns} gap-0 p-3 border-b border-white/10">
      {[...Array(columns)].map((_, i) => (
        <Skeleton key={i} variant="text" width="80%" height={14} />
      ))}
    </div>
    <div className="divide-y divide-white/5">
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-{columns} gap-0 p-3">
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width="90%" height={16} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ items?: number; className?: string }> = ({ 
  items = 5, 
  className = '' 
}) => (
  <div className={`space-y-3 ${className}`} aria-hidden="true">
    {[...Array(items)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-void-panel/50 border border-white/10 rounded-lg">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-1">
          <Skeleton variant="text" width="50%" />
          <Skeleton variant="text" width="30%" />
        </div>
        <Skeleton variant="rectangular" width={80} height={28} />
      </div>
    ))}
  </div>
);

export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="space-y-4" aria-hidden="true">
    {[...Array(fields)].map((_, i) => (
      <div key={i} className="space-y-1">
        <Skeleton variant="text" width="25%" height={14} />
        <Skeleton variant="rectangular" height={40} />
      </div>
    ))}
  </div>
);

export const ModalSkeleton: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-hidden="true">
    <div className="bg-void-panel border border-neon-cyan/30 rounded-xl shadow-[0_0_30px_rgba(0,240,255,0.2)] max-w-lg w-full max-h-[80vh] overflow-y-auto">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <Skeleton variant="text" width="40%" height={20} />
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <div className="p-4 space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
          <Skeleton variant="rectangular" width={80} height={36} />
          <Skeleton variant="rectangular" width={80} height={36} />
        </div>
      </div>
    </div>
  </div>
);

export default Skeleton;