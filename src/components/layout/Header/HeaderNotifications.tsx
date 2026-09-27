import React from "react";
import { Bell } from "lucide-react";

interface HeaderNotificationsProps {
  unreadCount: number;
  onClick?: () => void;
}

export const HeaderNotifications: React.FC<
  HeaderNotificationsProps
> = ({
  unreadCount,
  onClick,
}) => {
  return (
    <button
      type="button"
      aria-label="Notificações"
      onClick={onClick}
      className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
    >

      <Bell className="w-5 h-5" />

      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full border-2 border-white leading-none">
          {unreadCount}
        </span>
      )}

    </button>
  );
};

export default HeaderNotifications;