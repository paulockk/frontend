import type { DashboardLocation } from "../../../types/dashboard";

interface LocationCapacityItemProps {
  location: DashboardLocation;
}

export function LocationCapacityItem({
  location,
}: LocationCapacityItemProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="min-w-0">
          <span className="truncate font-semibold text-slate-800">
            {location.name}
          </span>
        </div>

        <div className="shrink-0">
          {location.criticalExpiryCount > 0 && (
            <span className="mr-2 rounded bg-red-100 px-1 text-[10px] font-bold text-red-700">
              {location.criticalExpiryCount} crítico
            </span>
          )}

          <span className="font-semibold text-slate-600">
            {location.capacityPercent}%
          </span>
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            location.capacityPercent > 85
              ? "bg-amber-500"
              : "bg-blue-600"
          }`}
          style={{
            width: `${location.capacityPercent}%`,
          }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{location.skuCount} SKUs</span>

        <span>
          {location.totalUnits.toLocaleString("pt-BR")} itens
        </span>
      </div>
    </div>
  );
}