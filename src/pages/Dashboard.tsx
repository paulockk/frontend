import { useMemo } from "react";
import { useNavigate } from "react-router";


import { KpiCards } from "../components/dashboard/KpiCards/KpiCards";

import { ExpiringLots } from "../components/dashboard/ExpringLots/ExpiringLots";

import { LocationCapacity } from "../components/dashboard/LocationCapacity/LocationCapacity";

import { RecentMovements } from "../components/dashboard/RecentMovements/RecentMovements";
import { SalesInsightsCarousel } from "../components/dashboard/SalesInsightsCarousel";

import { useDashboard } from "../hooks/useDashboard";
import { useLocationFilter } from "../contexts/LocationFilterContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { matchesLocation, selectedLocation, selectedLocationId } = useLocationFilter();

  const {
    data,
    loading,
    error,
    refresh,
  } = useDashboard();

  // Restringe cada bloco do painel ao local escolhido no seletor global.
  const visibleLots = useMemo(() => data?.expiringLots.filter((lot) => matchesLocation(lot.locationName)) ?? [], [data?.expiringLots, matchesLocation]);
  const visibleLocations = useMemo(() => data?.locations.filter((location) => matchesLocation(location.name)) ?? [], [data?.locations, matchesLocation]);
  const visibleMovements = useMemo(() => data?.recentMovements.filter((movement) => matchesLocation(movement.origin) || matchesLocation(movement.destination)) ?? [], [data?.recentMovements, matchesLocation]);
  const visibleSummary = useMemo(() => {
    if (!data) return null;
    if (selectedLocationId === "all") return data.summary;
    // Para um local específico, usa o resumo próprio em vez dos totais gerais.
    return data.locationSummaries?.find((item) => matchesLocation(item.locationName))?.summary ?? null;
  }, [data, matchesLocation, selectedLocationId]);
  const visibleInsights = useMemo(() => {
    if (!data?.salesInsights) return undefined;
    if (selectedLocationId === "all") return data.salesInsights;
    const local = data.salesInsights.byLocation?.find((item) => matchesLocation(item.locationName));
    if (!local) return undefined;
    return {
      ...data.salesInsights,
      bestSellers: local.bestSellers,
      slowMovers: local.slowMovers,
      weeklyTrend: local.weeklyTrend,
      locationSales: data.salesInsights.locationSales.filter((item) => matchesLocation(item.locationName)),
    };
  }, [data, matchesLocation, selectedLocationId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-sm text-slate-500">
            Carregando Dashboard...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-800">
            Não foi possível carregar o Dashboard
          </h2>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-6 p-6">

      <KpiCards summary={visibleSummary} />
      {selectedLocation && <p className="-mt-3 text-xs text-slate-500">Indicadores e gráficos para: <strong className="text-slate-700">{selectedLocation.name}</strong>.</p>}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <ExpiringLots
          lots={visibleLots}
          onViewAll={() => {
            navigate("/validades");
          }}
          onPrioritize={() => {
            navigate("/validades");
          }}
        />

        <SalesInsightsCarousel insights={visibleInsights} />

        <LocationCapacity locations={visibleLocations} />
      </div>

      <RecentMovements
        movements={visibleMovements}
        onViewAll={() => {
          navigate("/movimentacoes");
        }}
      />
    </div>
  );
}
