import type { NavItem, NavItemKey } from "./sidebar.types";
import { SidebarNavItem } from "./sidebarNavItem";

interface SidebarNavProps {
  items: NavItem[];
  activeKey: NavItemKey;
  onNavigate: (key: NavItemKey) => void;
}

export function SidebarNav({
  items,
  activeKey,
  onNavigate,
}: SidebarNavProps) {

  return (
    <nav className="px-3 space-y-1">

      {items.map((item) => (
        <SidebarNavItem
          key={item.id}
          item={item}
          isActive={activeKey === item.id}
          onClick={() => onNavigate(item.id)}
        />
      ))}

    </nav>
  );
}