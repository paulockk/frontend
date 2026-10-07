import {
  LayoutDashboard,
  Boxes,
  Package,
  ArrowLeftRight,
  MapPin,
  ShoppingCart,
  BarChart3,
  Settings,
} from "lucide-react";

import type { NavItem } from "./sidebar.types";

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "estoque",
    label: "Estoque",
    icon: Boxes,
  },
  {
    id: "produtos",
    label: "Produtos",
    icon: Package,
  },
  {
    id: "validades",
    label: "Validades",
    icon: Package,
  },
  {
    id: "movimentacoes",
    label: "Movimentações",
    icon: ArrowLeftRight,
  },
  {
    id: "locais",
    label: "Locais",
    icon: MapPin,
  },
  {
    id: "vendas",
    label: "Vendas",
    icon: ShoppingCart,
  },

  {
    id: "relatorios",
    label: "Relatórios",
    icon: BarChart3,
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icon: Settings,
    permission: "configuracoes.visualizar",
  },
];