import type { DashboardLocation } from "../../../types/dashboard";
import { LocationCapacityItem } from "./LocationCapacityItem";
import { CheckCircle2 } from "lucide-react";

interface LocationCapacityProps {
  locations: DashboardLocation[];
}

export function LocationCapacity({
  locations,
}: LocationCapacityProps) {
  return (
    <section className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-800">
            Capacidade por Ponto
          </h2>

          <span className="text-xs text-slate-400">
            {locations.length} unidades
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {locations.map((location) => (
            <LocationCapacityItem
              key={location.id}
              location={location}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

          <span>
            <strong>Regra PEPS (FIFO) Ativa:</strong>{" "}
            O sistema prioriza os lotes com vencimento mais próximo.
          </span>
        </div>
      </div>
    </section>
  );
}