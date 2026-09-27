import { useEffect, useState } from "react";
import { ArrowLeftRight, Download, RefreshCw } from "lucide-react";
import { StockFilters } from "../components/stock/StockFilters";
import { StockSummary } from "../components/stock/StockSummary";
import { StockTable } from "../components/stock/StockTable";
import { stockService } from "../services/stock.service";
import type { StockFilters as Filters, StockListResponse } from "../types/stock";

const initialFilters: Filters = { search: "", locationId: "ALL", categoryId: "ALL", status: "ALL", expiry: "ALL", lowStockOnly: false, page: 1, pageSize: 10 };
export default function Estoque() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<StockListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    stockService.list(filters).then((result) => { if (active) setData(result); }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o estoque."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);
  const pagination = data?.pagination;
  return <div className="min-w-0 space-y-6 p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">Módulo de operações · CD e unidades</p><h1 className="text-2xl font-bold tracking-tight text-slate-900">Estoque geral</h1><p className="mt-1 text-sm text-slate-500">Consulte produtos, quantidades, lotes e validade por local.</p></div><div className="flex gap-2"><button type="button" onClick={() => { const csv = ["Produto;Código;Local;Quantidade;Mínimo;Validade", ...(data?.items ?? []).map((item) => [item.product.name, item.product.barcode, item.location.name, item.stock.quantity, item.product.minimumStock ?? "", item.batch.expirationDate ?? ""].join(";"))].join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = "estoque.csv"; link.click(); URL.revokeObjectURL(link.href); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Exportar</button><button type="button" onClick={() => setFilters((current) => ({ ...current }))} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><ArrowLeftRight className="h-4 w-4" />Nova movimentação</button></div></div>
    {data && <StockSummary summary={data.summary} />}
    {data && <StockFilters filters={filters} locations={data.locations} categories={data.categories} onChange={setFilters} />}
    {error && <div role="alert" className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => setFilters((current) => ({ ...current }))} className="font-semibold">Tentar novamente <RefreshCw className="inline h-3.5 w-3.5" /></button></div>}
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs"><StockTable items={data?.items ?? []} loading={loading} /><div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><label>Linhas por página <select value={filters.pageSize} onChange={(event) => setFilters((current) => ({ ...current, pageSize: Number(event.target.value), page: 1 }))} className="ml-2 rounded border border-slate-200 bg-white px-2 py-1"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label><span>{pagination?.totalItems ? `${(filters.page - 1) * filters.pageSize + 1}–${Math.min(filters.page * filters.pageSize, pagination.totalItems)} de ${pagination.totalItems}` : "0 registros"}</span></div><div className="flex items-center gap-2"><span>Página {pagination?.page ?? 1} de {pagination?.totalPages ?? 1}</span><button type="button" disabled={filters.page <= 1 || loading} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))} className="rounded border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40">Anterior</button><button type="button" disabled={!pagination || filters.page >= pagination.totalPages || loading} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))} className="rounded border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40">Próxima</button></div></div></section>
  </div>;
}
