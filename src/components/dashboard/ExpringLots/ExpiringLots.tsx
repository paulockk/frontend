import { useState } from "react";
import { ArrowRight } from "lucide-react";

import type { DashboardExpiringLot } from "../../../types/dashboard";

import { ExpiringLotsTable } from "./ExperingLotsTable";

interface ExpiringLotsProps {
  lots: DashboardExpiringLot[];
  onPrioritize?: (lot: DashboardExpiringLot) => void;
  onViewAll?: () => void;
}

export function ExpiringLots({
  lots,
  onPrioritize,
  onViewAll,
}: ExpiringLotsProps) {
  const [criticalOnly, setCriticalOnly] = useState(false);

  const visibleLots = criticalOnly
    ? lots.filter(
        (lot) =>
          lot.status === "CRITICAL" ||
          lot.status === "EXPIRED"
      )
    : lots;

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs lg:col-span-2">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-2.5 w-2.5 shrink-0 animate-ping rounded-full bg-red-600" />

          <h2 className="truncate text-base font-bold text-slate-800">
            Lotes em Risco Iminente de Vencimento
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setCriticalOnly((value) => !value)}
          className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
        >
          {criticalOnly
            ? "Ver Todos"
            : "Mostrar Apenas Críticos"}
        </button>
      </div>

      <ExpiringLotsTable
        lots={visibleLots}
        onPrioritize={onPrioritize}
      />

      <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
        <span>
          Mostrando {visibleLots.length} lotes
        </span>

        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex shrink-0 items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
        >
          Ir para Central de Validades
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}