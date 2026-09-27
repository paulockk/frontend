

export interface GatewayStatus {
  connected: boolean;
  lastSync: string;
}

export interface HeaderUser {
  id?: string | number;
  name: string;
  role: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

export interface LocationOption {
  id: string;
  name: string;
  type?: "cd" | "mercadinho" | "vending";
}

export interface HeaderProps {
  onSearch?: (query: string) => void;

  selectedLocation?: string;
  onLocationChange?: (locationId: string) => void;

  unreadNotificationsCount?: number;

  gatewayStatus?: GatewayStatus;

  user?: HeaderUser;

  locations?: LocationOption[];

  onNotificationsClick?: () => void;
  onHelpClick?: () => void;
  onProfileClick?: () => void;
}