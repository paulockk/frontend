import { MoreVertical } from "lucide-react";
import type { UserProfile } from "./sidebar.types";

interface SidebarUserProps {
  user: UserProfile;
}

export function SidebarUser({ user }: SidebarUserProps) {

  return (
    <div className="p-3 border-t border-slate-800/80 bg-[#090f20]/60">

      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer group">

        <div className="flex items-center gap-3 min-w-0">

          <div className="relative shrink-0">

            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-700"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {user.isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0b1329] rounded-full" />
            )}

          </div>

          <div className="flex flex-col min-w-0">

            <span className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
              {user.name}
            </span>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">

              <span className="truncate">
                {user.role}
              </span>

              <span className="inline-block w-1 h-1 rounded-full bg-slate-500" />

              {user.isOnline && (
                <span className="text-emerald-400 font-medium">
                  Online
                </span>
              )}

            </div>

          </div>

        </div>

        <button
          type="button"
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          title="Mais opções"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

      </div>

    </div>
  );
}