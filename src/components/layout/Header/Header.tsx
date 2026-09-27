import React from "react";

import HeaderSearch from "./HeaderSearch";
import HeaderLocation from "./HeaderLocation";
import HeaderGatewayStatus from "./HeaderGatewayStatus";
import HeaderNotifications from "./HeaderNotifications";
import HeaderHelp from "./HeaderHelp";
import HeaderUser from "./HeaderUser";

import {
  DEFAULT_GATEWAY_STATUS,
  DEFAULT_HEADER_USER,
  DEFAULT_LOCATIONS,
  DEFAULT_UNREAD_NOTIFICATIONS,
} from "./header.data";

import type { HeaderProps } from "./header.types";

export const Header: React.FC<HeaderProps> = ({
  onSearch,

  selectedLocation = "all",
  onLocationChange,

  unreadNotificationsCount =
    DEFAULT_UNREAD_NOTIFICATIONS,

  gatewayStatus = DEFAULT_GATEWAY_STATUS,

  user = DEFAULT_HEADER_USER,

  locations = DEFAULT_LOCATIONS,

  onNotificationsClick,
  onHelpClick,
  onProfileClick,
}) => {
  return (
    <header className="h-16 w-full bg-white border-b border-slate-200/80 px-6 flex items-center justify-between gap-4 font-sans select-none z-10 shrink-0">

      {/* =========================
          LADO ESQUERDO
      ========================= */}

      <div className="flex items-center gap-4 flex-1 max-w-xl">

        <HeaderSearch
          onSearch={onSearch}
        />

        <HeaderLocation
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
        />

      </div>

      {/* =========================
          LADO DIREITO
      ========================= */}

      <div className="flex items-center gap-3 md:gap-4 shrink-0">

        <HeaderGatewayStatus
          status={gatewayStatus}
        />

        <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

        <HeaderNotifications
          unreadCount={unreadNotificationsCount}
          onClick={onNotificationsClick}
        />

        <HeaderHelp
          onClick={onHelpClick}
        />

        <HeaderUser
          user={user}
          onClick={onProfileClick}
        />

      </div>

    </header>
  );
};

export default Header;