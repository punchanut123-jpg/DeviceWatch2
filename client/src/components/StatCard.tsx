import type { LucideIcon } from 'lucide-react';

export type StatTone = 'default' | 'success' | 'danger' | 'warning';

interface StatCardProps {
  label: string;
  value: number;
  tone?: StatTone;
  icon: LucideIcon;
}

export default function StatCard({ label, value, tone = 'default', icon: Icon }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-tone-${tone}`}>
      <div className="stat-card-icon">
        <Icon size={20} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
