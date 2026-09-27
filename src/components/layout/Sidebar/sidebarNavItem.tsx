import type { NavItem } from "./sidebar.types";

interface SidebarNavItemProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

export function SidebarNavItem({
  item,
  isActive,
  onClick,
}: SidebarNavItemProps) {

  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
        isActive
          ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
      }`}
    >

      <div className="flex items-center gap-3">

        <Icon
          className={`w-5 h-5 transition-colors ${
            isActive
              ? "text-white"
              : "text-slate-400 group-hover:text-slate-200"
          }`}
        />

        <span>{item.label}</span>

      </div>

      {item.badge && (
        <div>

          {item.badge.variant === "danger" && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full shadow-sm">
              {item.badge.count}
            </span>
          )}

          {item.badge.variant === "dot" && (
            <span className="block w-2 h-2 rounded-full bg-blue-400 ring-4 ring-blue-500/20" />
          )}

        </div>
      )}

    </button>
  );
}