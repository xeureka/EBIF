import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="border border-line bg-ink p-5 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-mute">{label}</p>
        {icon && <div className="text-gold">{icon}</div>}
      </div>
      <p className="mt-3 font-display text-3xl font-medium text-cream sm:text-4xl">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-mute">{subtitle}</p>}
    </div>
  );
}
