import type { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'text-primary bg-primary-light',
  success: 'text-success bg-success-light',
  warning: 'text-warning bg-warning-light',
  danger: 'text-danger bg-danger-light',
};

export default function StatsCard({ title, value, icon, trend, variant = 'default' }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg border border-border p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-semibold text-text-primary mt-1 tabular-nums">{value}</p>
          {trend && (
            <p className="text-xs text-text-muted mt-1">{trend}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${variantStyles[variant]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
