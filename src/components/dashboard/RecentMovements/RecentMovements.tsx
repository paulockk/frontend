import { ExternalLink } from "lucide-react";

import type { DashboardMovement } from "../../../types/dashboard";

import { RecentMovementsTable } from "./RecentMovementsTable";

interface RecentMovementsProps {
  movements: DashboardMovement[];
  onViewAll?: () => void;
}

export function RecentMovements({
  movements,
  onViewAll,
}: RecentMovementsProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Últimas Movimentações Registradas
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            Fluxo recente de movimentações de estoque
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Ver Histórico Completo
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      <RecentMovementsTable
        movements={movements}
      />
    </section>
  );
}