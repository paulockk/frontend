import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../services/api";

import { SidebarLogo } from "./sidebarLogo";
import { SidebarNav } from "./SidebarNav";
import { SidebarUser } from "./sidebarUser";

import { DEFAULT_NAV_ITEMS } from "./sidebar.data";

import type {
  SidebarProps,
  NavItemKey,
} from "./sidebar.types";

const permissionForNavItem: Partial<Record<NavItemKey, string>> = {
  dashboard: "dashboard.view",
  estoque: "stock.view",
  produtos: "products.view",
  validades: "stock.view",
  movimentacoes: "stock.view",
  locais: "locations.view",
  vendas: "sales.view",
  relatorios: "reports.view",
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeKey = "dashboard",
  onNavigate,
  user = {
    name: "Carlos Eduardo",
    role: "Administrador",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
    isOnline: true,
  },
  navItems = DEFAULT_NAV_ITEMS,
}) => {

  const navigate = useNavigate();
  const [urgentExpiryCount, setUrgentExpiryCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const loadUrgentExpiryCount = async () => {
      try {
        const result = await apiFetch<{ expiration: { expiredCount: number; criticalCount: number } }>("/stock/alerts?limit=1");
        if (active) setUrgentExpiryCount(result.expiration.expiredCount + result.expiration.criticalCount);
      } catch {
        if (active) setUrgentExpiryCount(null);
      }
    };

    void loadUrgentExpiryCount();
    const interval = window.setInterval(() => void loadUrgentExpiryCount(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const resolvedNavItems = useMemo(() => navItems.map((item) => item.id === "validades"
    ? { ...item, badge: urgentExpiryCount ? { count: urgentExpiryCount, variant: "danger" as const } : undefined }
    : item).filter((item) => user.isAdmin || (
      item.id !== "configuracoes" &&
      (!permissionForNavItem[item.id] || user.permissions?.includes(permissionForNavItem[item.id]!))
    )), [navItems, urgentExpiryCount, user.isAdmin, user.permissions]);

  const [current, setCurrent] =
    useState<NavItemKey>(activeKey);

  const handleNavigate = (key: NavItemKey) => {

    setCurrent(key);

    navigate(`/${key}`);

    onNavigate?.(key);
  };

  return (
    <aside className="w-64 min-w-[16rem] h-screen bg-[#0b1329] text-slate-300 flex flex-col justify-between border-r border-slate-800/80 select-none font-sans shrink-0">

      <div className="flex flex-col overflow-y-auto">

        <SidebarLogo />

        <div className="px-5 pt-5 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Navegação Principal
        </div>

        <SidebarNav
          items={resolvedNavItems}
          activeKey={current}
          onNavigate={handleNavigate}
        />

      </div>

      <SidebarUser user={user} />

    </aside>
  );
};

export default Sidebar;
