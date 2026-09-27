import {
  AlertTriangle,
  CalendarHeart,
  Package,
  TrendingUp,
} from "lucide-react";

import type { DashboardSummary } from "../../../types/dashboard";

import { KpiCard } from "./KpiCard";

interface KpiCardsProps {
  summary: DashboardSummary;
}

export function KpiCards({ summary }: KpiCardsProps) {
  const kpis = [
    {
      id: "products",
      title: "Produtos Cadastrados",
      value: summary.totalProducts.toLocaleString("pt-BR"),
      subtext: `${summary.totalLocations} locais ativos`,
      icon: <Package className="h-4 w-4" />,
      color: "blue" as const,
    },

    {
      id: "expiry",
      title: "Validade Crítica",
      value: `${summary.criticalExpiryLots} lotes`,
      subtext: formatCurrency(summary.criticalExpiryValue),
      icon: <CalendarHeart className="h-4 w-4" />,
      color: "red" as const,
    },

    {
      id: "stock",
      title: "Estoque em Alerta",
      value: `${summary.lowStockProducts} SKUs`,
      subtext: "Abaixo do estoque mínimo",
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "amber" as const,
    },

    {
      id: "sales",
      title: "Vendas na Semana",
      value: summary.weeklySalesQuantity.toLocaleString("pt-BR"),
      subtext: formatQuantityLabel(summary.weeklySalesAmount),
      icon: <TrendingUp className="h-4 w-4" />,
      color: "emerald" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.id}
          title={kpi.title}
          value={kpi.value}
          subtext={kpi.subtext}
          icon={kpi.icon}
          color={kpi.color}
        />
      ))}
    </div>
  );
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

function formatQuantityLabel(valueInCents: number) {
  return `Vendas: ${formatCurrency(valueInCents)}`;
}
