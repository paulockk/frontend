import type { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: ReactNode;
  color: "blue" | "red" | "amber" | "emerald";
}

const colorClasses = {
  blue: "border-blue-100 bg-blue-50 text-blue-600",
  red: "border-red-100 bg-red-50 text-red-600",
  amber: "border-amber-100 bg-amber-50 text-amber-600",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
};

export function KpiCard({
  title,
  value,
  subtext,
  icon,
  color,
}: KpiCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>

        <div
          className={`rounded-lg border p-2 ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </div>

        <div className="mt-1 text-xs text-slate-400">
          {subtext}
        </div>
      </div>
    </div>
  );
}