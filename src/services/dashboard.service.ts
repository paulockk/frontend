import { apiFetch } from "./api";

import { dashboardMock } from "./mocks/dashboard.mock";

import type { DashboardResponse } from "../types/dashboard";

const USE_MOCK = true;

export const dashboardService = {
  async getDashboard(): Promise<DashboardResponse> {
    if (USE_MOCK) {
      return dashboardMock;
    }

    return apiFetch<DashboardResponse>("/dashboard");
  },
};