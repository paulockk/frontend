import { useCallback, useEffect, useState } from "react";

import { dashboardService } from "../services/dashboard.service";
import type { DashboardResponse } from "../types/dashboard";

interface UseDashboardResult {
  data: DashboardResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await dashboardService.getDashboard();

      setData(result);
    } catch (err) {
      console.error("Erro ao carregar Dashboard:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o Dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadDashboard]);

  return {
    data,
    loading,
    error,
    refresh: loadDashboard,
  };
}
