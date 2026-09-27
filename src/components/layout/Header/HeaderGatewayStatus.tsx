import React from "react";

import type { GatewayStatus } from "./header.types";

interface HeaderGatewayStatusProps {
  status: GatewayStatus;
}

export const HeaderGatewayStatus: React.FC<
  HeaderGatewayStatusProps
> = ({ status }) => {
  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-full text-xs">

      <span
        className={`w-2 h-2 rounded-full ${
          status.connected
            ? "bg-blue-600 animate-pulse"
            : "bg-amber-500"
        }`}
      />

      <span className="text-slate-600 font-medium">
        {status.connected
          ? "Gateway Conectado"
          : "Gateway Desconectado"}
      </span>

      <span className="text-slate-300">
        •
      </span>

      <span className="text-slate-500 text-[11px]">
        Sinc. {status.lastSync}
      </span>

    </div>
  );
};

export default HeaderGatewayStatus;