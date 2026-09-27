import type { DashboardExpiringLot } from "../../../types/dashboard";

interface ExpiringLotsTableProps {
  lots: DashboardExpiringLot[];
  onPrioritize?: (lot: DashboardExpiringLot) => void;
}

export function ExpiringLotsTable({
  lots,
  onPrioritize,
}: ExpiringLotsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-xs">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
          <tr>
            <th className="px-4 py-3">Produto & SKU</th>
            <th className="px-3 py-3">Localização</th>
            <th className="px-3 py-3">Lote</th>
            <th className="px-3 py-3 text-center">
              Vencimento
            </th>
            <th className="px-3 py-3 text-right">
              Qtd
            </th>
            <th className="px-4 py-3 text-center">
              Ação
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {lots.map((lot) => (
            <tr
              key={lot.id}
              className="hover:bg-slate-50/60"
            >
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-900">
                  {lot.productName}
                </div>

                <div className="font-mono text-[11px] text-slate-400">
                  {lot.barcode}
                </div>
              </td>

              <td className="px-3 py-3">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {lot.locationName}
                </span>
              </td>

              <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                {lot.batchCode}
              </td>

              <td className="px-3 py-3 text-center">
                <ExpiryStatus
                  status={lot.status}
                  expirationDate={lot.expirationDate}
                  daysRemaining={lot.daysRemaining}
                />
              </td>

              <td className="px-3 py-3 text-right font-bold text-slate-900">
                {lot.quantity} {lot.unit}
              </td>

              <td className="px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => onPrioritize?.(lot)}
                  className="whitespace-nowrap rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Priorizar Reposição
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpiryStatus({
  status,
  expirationDate,
  daysRemaining,
}: {
  status: DashboardExpiringLot["status"];
  expirationDate: string | null;
  daysRemaining: number;
}) {
  const classes = {
    EXPIRED: "bg-red-100 text-red-800 border-red-200",
    CRITICAL: "bg-red-50 text-red-700 border-red-200",
    WARNING: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div
      className={`inline-flex flex-col items-center rounded border px-2 py-0.5 ${classes[status]}`}
    >
      <span>
        {expirationDate ?? "Sem validade"}
      </span>

      <span className="text-[10px] font-semibold">
        {status === "EXPIRED"
          ? "Vencido"
          : `${daysRemaining} dias`}
      </span>
    </div>
  );
}