import type {
  GatewayStatus,
  HeaderUser,
  LocationOption,
} from "./header.types";

export const DEFAULT_GATEWAY_STATUS: GatewayStatus = {
  connected: true,
  lastSync: "14:32",
};

export const DEFAULT_HEADER_USER: HeaderUser = {
  name: "Carlos Eduardo",
  role: "Administrador",
  avatarUrl:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
  isOnline: true,
};

export const DEFAULT_LOCATIONS: LocationOption[] = [
  {
    id: "all",
    name: "Todos os Locais",
  },
  {
    id: "cd",
    name: "Centro de Distribuição",
    type: "cd",
  },
  {
    id: "mercadinho-1",
    name: "Mercadinho 1",
    type: "mercadinho",
  },
  {
    id: "mercadinho-2",
    name: "Mercadinho 2",
    type: "mercadinho",
  },
  {
    id: "mercadinho-3",
    name: "Mercadinho 3",
    type: "mercadinho",
  },
  {
    id: "vending-1",
    name: "Vending Machine 1",
    type: "vending",
  },
  {
    id: "vending-2",
    name: "Vending Machine 2",
    type: "vending",
  },
];

export const DEFAULT_UNREAD_NOTIFICATIONS = 4;