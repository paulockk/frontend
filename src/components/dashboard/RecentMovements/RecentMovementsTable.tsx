import type { DashboardMovement } from "../../../types/dashboard";

interface RecentMovementsTableProps {
  movements: DashboardMovement[];
}

export function RecentMovementsTable({
  movements,
}: RecentMovementsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-xs">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
          <tr>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-3 py-3">Produto / Código</th>
            <th className="px-3 py-3">Origem</th>
            <th className="px-3 py-3">Destino</th>
            <th className="px-3 py-3 text-right">
              Quantidade
            </th>
            <th className="px-3 py-3">
              Responsável
            </th>
            <th className="px-4 py-3 text-right">
              Data/Hora
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {movements.map((movement) => (
            <tr
              key={movement.id}
              className="hover:bg-slate-50/60"
            >
              <td className="px-4 py-3">
                <MovementType type={movement.type} />
              </td>

              <td className="px-3 py-3">
                <span className="block font-semibold text-slate-900">
                  {movement.productName}
                </span>

                <span className="font-mono text-[11px] text-slate-400">
                  {movement.barcode}
                </span>
              </td>

              <td className="px-3 py-3 text-slate-600">
                {movement.origin ?? "-"}
              </td>

              <td className="px-3 py-3 font-semibold text-slate-800">
                {movement.destination ?? "-"}
              </td>

              <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">
                {movement.quantity}
              </td>

              <td className="px-3 py-3 text-slate-500">
                {movement.userName}
              </td>

              <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-400">
                {new Date(
                  movement.createdAt
                ).toLocaleString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MovementType({
  type,
}: {
  type: DashboardMovement["type"];
}) {
  const classes = {
    ENTRY: "bg-emerald-50 text-emerald-700",
    EXIT: "bg-slate-100 text-slate-700",
    TRANSFER: "bg-blue-50 text-blue-700",
    ADJUSTMENT: "bg-amber-50 text-amber-700",
  };

  const labels = {
    ENTRY: "Entrada",
    EXIT: "Saída",
    TRANSFER: "Transferência",
    ADJUSTMENT: "Ajuste",
  };

  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-bold ${classes[type]}`}
    >
      {labels[type]}
    </span>
  );
}