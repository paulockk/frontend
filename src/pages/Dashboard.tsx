import { useNavigate } from "react-router";


import { KpiCards } from "../components/dashboard/KpiCards/KpiCards";

import { ExpiringLots } from "../components/dashboard/ExpringLots/ExpiringLots";

import { LocationCapacity } from "../components/dashboard/LocationCapacity/LocationCapacity";

import { RecentMovements } from "../components/dashboard/RecentMovements/RecentMovements";

import { useDashboard } from "../hooks/useDashboard";

export default function Dashboard() {
  const navigate = useNavigate();

  const {
    data,
    loading,
    error,
    refresh,
  } = useDashboard();

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

      <KpiCards summary={data.summary} />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        <ExpiringLots
          lots={data.expiringLots}
          onViewAll={() => {
            navigate("/validades");
          }}
          onPrioritize={(lot) => {
            console.log("Priorizar lote", lot.id);
          }}
        />

        <LocationCapacity
          locations={data.locations}
        />
      </div>

      <RecentMovements
        movements={data.recentMovements}
        onViewAll={() => {
          navigate("/movimentacoes");
        }}
      />
    </div>
  );
}