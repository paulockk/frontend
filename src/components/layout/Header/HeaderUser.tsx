import React from "react";
import { ChevronDown } from "lucide-react";

import type { HeaderUser as HeaderUserType } from "./header.types";

interface HeaderUserProps {
  user: HeaderUserType;
  onClick?: () => void;
}

export const HeaderUser: React.FC<HeaderUserProps> = ({
  user,
  onClick,
}) => {
  return (
    <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">

      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors"
      >

        <div className="relative">

          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          {user.isOnline && (
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
          )}

        </div>

        <div className="hidden xl:flex flex-col text-left">

          <span className="text-xs font-semibold text-slate-800 leading-tight">
            {user.name}
          </span>

          <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
            {user.role}
          </span>

        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />

      </button>

    </div>
  );
};

export default HeaderUser;