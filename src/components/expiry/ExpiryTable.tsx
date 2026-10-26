import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { expiryService } from "../../services/expiry.service";
import type { ExpiryLot } from "../../types/expiry";
import { formatIsoDateAsBrazilian, maskBrazilianDate, parseBrazilianDate } from "../../utils/date";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface ExpiryTableProps {
  items: ExpiryLot[];
  loading: boolean;
  canEditExpiry: boolean;
  onExpiryUpdated: () => void;
}

function getDeadlineTone(daysRemaining: number) {
  if (daysRemaining < 0) return "bg-red-100 text-red-700 border-red-200";
  if (daysRemaining <= 7) return "bg-amber-100 text-amber-800 border-amber-200";
  if (daysRemaining <= 15) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function formatDeadline(daysRemaining: number) {
  if (daysRemaining < 0) return `Vencido há ${Math.abs(daysRemaining)}d`;
  return `${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"}`;
}

export function ExpiryTable({
  items,
  loading,
  canEditExpiry,
  onExpiryUpdated,
}: ExpiryTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const saveExpiry = async (batchId: string) => {
    const isoDate = parseBrazilianDate(draftDate);
    if (!isoDate) {
      setError("Digite uma data válida no formato dd/mm/aaaa.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await expiryService.updateExpiryDate(batchId, isoDate);
      setEditingId(null);
      onExpiryUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a validade.");
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-500">Carregando lotes...</div>;
  }

  if (!items.length) {
    return (
      <div className="p-12 text-center">
        <p className="font-semibold text-slate-700">Nenhum lote encontrado</p>
        <p className="mt-1 text-sm text-slate-400">Altere a busca ou os filtros.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Lote / SKU</th>
            <th className="px-3 py-3">Produto</th>
            <th className="px-3 py-3">Local</th>
            <th className="px-3 py-3 text-center">Vencimento</th>
            <th className="px-3 py-3 text-center">Prazo</th>
            <th className="px-3 py-3 text-right">Quantidade</th>
            <th className="px-3 py-3 text-right">Custo total</th>
            <th className="px-3 py-3">Ação recomendada</th>
            <th className="px-4 py-3 text-center">Operação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((lot) => {
            const expired = lot.daysRemaining < 0;
            const operationLabel = expired ? "Bloqueado para venda" : "Prioridade na venda";
            const operationClass = expired
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-700";

            return (
              <tr key={lot.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <p className="font-mono font-bold text-slate-800">{lot.batchNumber}</p>
                  <p className="font-mono text-xs text-slate-400">{lot.sku}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-800">{lot.productName}</p>
                  <p className="text-xs text-slate-400">
                    {lot.category} · {lot.barcode}
                  </p>
                </td>
                <td className="px-3 py-3 text-slate-600">{lot.location}</td>
                <td className="px-3 py-3 text-center font-mono text-slate-700">
                  {dateFormat.format(new Date(`${lot.expiryDate.slice(0, 10)}T00:00:00Z`))}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getDeadlineTone(lot.daysRemaining)}`}
                  >
                    {formatDeadline(lot.daysRemaining)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold">
                  {lot.quantity} {lot.unit}
                </td>
                <td className="px-3 py-3 text-right font-mono text-slate-600">
                  {currency.format(lot.totalCost)}
                </td>
                <td className="px-3 py-3 text-slate-600">{lot.recommendedAction}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${operationClass}`}>
                      {operationLabel}
                    </span>
                    {canEditExpiry && (editingId === lot.id ? (
                      <div className="flex items-center gap-1">
                        <input aria-label={`Nova validade do lote ${lot.batchNumber} (dd/mm/aaaa)`} type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} value={draftDate} onChange={(event) => setDraftDate(maskBrazilianDate(event.target.value))} className="w-28 rounded border border-slate-200 px-2 py-1 text-xs" />
                        <button type="button" aria-label="Salvar validade" disabled={draftDate.length !== 10 || saving} onClick={() => void saveExpiry(lot.id)} className="rounded bg-blue-600 p-1.5 text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label="Cancelar edição" disabled={saving} onClick={() => { setEditingId(null); setError(""); }} className="rounded bg-slate-100 p-1.5 text-slate-600"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setEditingId(lot.id); setDraftDate(formatIsoDateAsBrazilian(lot.expiryDate)); setError(""); }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Pencil className="h-3 w-3" />Editar validade</button>
                    ))}
                    {editingId === lot.id && error && <p role="alert" className="max-w-40 text-xs text-red-600">{error}</p>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
