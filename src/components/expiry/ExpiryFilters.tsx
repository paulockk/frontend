import { Barcode, Search } from "lucide-react";
import type { ExpiryFilters as Filters, ExpirySeverity } from "../../types/expiry";

export function ExpiryFilters({ filters, locations, categories, onChange }: { filters: Filters; locations: string[]; categories: string[]; onChange: (filters: Filters) => void }) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch, page: 1 });
  const selectClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700";
  return <section className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs" aria-label="Filtros de validades">
    <div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={filters.search} onChange={(e) => update({ search: e.target.value })} placeholder="Buscar por produto, SKU, lote ou código de barras" aria-label="Buscar lotes" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><Barcode className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div>
    <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
      <label className="text-xs font-semibold text-slate-500">Local<select className={selectClass} value={filters.location} onChange={(e) => update({ location: e.target.value })}><option value="ALL">Todos os locais</option>{locations.map((location) => <option key={location}>{location}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500">Categoria<select className={selectClass} value={filters.category} onChange={(e) => update({ category: e.target.value })}><option value="ALL">Todas as categorias</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500">Faixa de validade<select className={selectClass} value={filters.severity} onChange={(e) => update({ severity: e.target.value as ExpirySeverity | "ALL" })}><option value="ALL">Todas as faixas</option><option value="EXPIRED">Vencido</option><option value="CRITICAL">Crítico (até 7 dias)</option><option value="WARNING">Atenção (8 a 15 dias)</option><option value="REGULAR">Regular (mais de 15 dias)</option></select></label>
    </div>
  </section>;
}
