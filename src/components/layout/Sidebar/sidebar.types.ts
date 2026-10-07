import React from "react";

export type NavItemKey =
  | "dashboard"
  | "estoque"
  | "produtos"
  | "validades"
  | "movimentacoes"
  | "locais"
  | "vendas"
  | "vending-machines"
  | "relatorios"
  | "usuarios"
  | "configuracoes";

export interface NavItem {
  id: NavItemKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;

  badge?: {
    count?: number | string;
    variant: "danger" | "dot";
  };

  permission?: string;
}

export interface UserProfile {
  id?: string | number;
  name: string;
  role: string;
  avatarUrl?: string;
  isOnline?: boolean;
  permissions?: string[];
  isAdmin?: boolean;
}

export interface SidebarProps {
  activeKey?: NavItemKey;
  onNavigate?: (key: NavItemKey) => void;
  user?: UserProfile;
  navItems?: NavItem[];
}
