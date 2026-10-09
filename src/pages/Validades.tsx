import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Printer } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { ExpiryFilters } from "../components/expiry/ExpiryFilters";
import { ExpirySummary } from "../components/expiry/ExpirySummary";
import { ExpiryTable } from "../components/expiry/ExpiryTable";
import { useLocationFilter } from "../contexts/LocationFilterContext";
import { expiryService } from "../services/expiry.service";
import type {
  ExpiryFilters as Filters,
  ExpiryListResponse,
} from "../types/expiry";

const initialFilters = (search: string): Filters => ({
  search,
  location: "ALL",
  category: "ALL",
  severity: "ALL",
  page: 1,
  pageSize: 10,
});

export default function Validades() {
  const [searchParams] = useSearchParams();
  const { selectedLocationId, selectedLocation } = useLocationFilter();
  const [filters, setFilters] = useState(() =>
    initialFilters(searchParams.get("search") ?? ""),
  );
  const [data, setData] = useState<ExpiryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    setFilters((current) => ({ ...current }));
  }, []);

  // A busca do cabeçalho envia o termo na URL; sincroniza esse valor com os filtros da tela.
  useEffect(() => {
    setFilters((current) => ({
      ...current,
      search: searchParams.get("search") ?? "",
      page: 1,
    }));
  }, [searchParams]);

  // Descarta respostas antigas se os filtros mudarem antes de uma consulta terminar.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    expiryService
      .list(filters)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar as validades.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters]);

  // O seletor global de local também define o local aplicado nesta tabela.
  useEffect(() => {
    if (selectedLocationId === "all") {
      setFilters((current) =>
        current.location === "ALL"
          ? current
          : { ...current, location: "ALL", page: 1 },
      );
      return;
    }

    if (!selectedLocation) return;
    setFilters((current) =>
      current.location === selectedLocation.name
        ? current
        : { ...current, location: selectedLocation.name, page: 1 },
    );
  }, [selectedLocationId, selectedLocation]);

  const pagination = data?.pagination;

  return (
    <div className="min-w-0 space-y-6 p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-red-600">
            Controle sanitário · Prevenção de perdas
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Central de controle de validades
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitore lotes, priorize a saída PEPS e reduza perdas por vencimento.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Imprimir relatório de vencimentos
          </button>
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Validade priorizada nas vendas
          </span>
        </div>
        <p className="text-sm text-slate-500">
          As vendas usam primeiro o lote válido com vencimento mais próximo. Lotes vencidos ficam fora da baixa automática.
        </p>
      </header>

      {data && <ExpirySummary summary={data.summary} />}
      {data && (
        <ExpiryFilters
          filters={filters}
          locations={data.locations}
          categories={data.categories}
          onChange={setFilters}
        />
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button type="button" onClick={refresh} className="font-semibold">
            Tentar novamente
          </button>
        </div>
      )}
      <section
        className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs"
        aria-label="Lotes e validades"
      >
        <ExpiryTable
          items={data?.items ?? []}
          loading={loading}
        />
        <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label>
              Linhas por página
              <select
                value={filters.pageSize}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    pageSize: Number(event.target.value),
                    page: 1,
                  }))
                }
                className="ml-2 rounded border border-slate-200 bg-white px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
            <span>
              {pagination?.totalItems
                ? `${(filters.page - 1) * filters.pageSize + 1}–${Math.min(filters.page * filters.pageSize, pagination.totalItems)} de ${pagination.totalItems} lotes`
                : "0 lotes"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Página {pagination?.page ?? 1} de {pagination?.totalPages ?? 1}
            </span>
            <button
              type="button"
              disabled={filters.page <= 1 || loading}
              onClick={() =>
                setFilters((current) => ({ ...current, page: current.page - 1 }))
              }
              className="rounded border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!pagination || filters.page >= pagination.totalPages || loading}
              onClick={() =>
                setFilters((current) => ({ ...current, page: current.page + 1 }))
              }
              className="rounded border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
