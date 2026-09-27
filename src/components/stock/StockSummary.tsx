import { AlertTriangle, Boxes, CheckCircle2, DollarSign, XCircle } from "lucide-react";
import type { StockSummary as Summary } from "../../types/stock";

const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export function StockSummary({ summary }: { summary: Summary }) {
  const cards = [
    { title: "Itens em estoque", value: summary.totalUnits.toLocaleString("pt-BR"), unit: "unidades", sub: "Quantidade total nas unidades", Icon: Boxes, color: "text-blue-600 bg-blue-50" },
    { title: "Valor em custo", value: currency(summary.totalCost), unit: "", sub: "Baseado no custo de compra", Icon: DollarSign, color: "text-indigo-600 bg-indigo-50" },
    { title: "Itens normais", value: String(summary.normalProducts), unit: "SKUs", sub: "Acima do estoque mínimo", Icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { title: "Em alerta / baixo", value: String(summary.lowStockProducts), unit: "SKUs", sub: "Abaixo do estoque mínimo", Icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
    { title: "Itens zerados", value: String(summary.outOfStockProducts), unit: "SKUs", sub: "Sem unidades disponíveis", Icon: XCircle, color: "text-red-600 bg-red-50" },
  ];
  return <section aria-label="Resumo do estoque" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ title, value, unit, sub, Icon, color }) => <article key={title} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs"><div className="flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h2><span className={`rounded-lg p-2 ${color}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-extrabold text-slate-900">{value} <span className="text-xs font-medium text-slate-400">{unit}</span></p><p className="mt-1 text-xs text-slate-400">{sub}</p></article>)}</section>;
}
