import { Outlet } from "react-router";

import { Sidebar } from "./components/layout/Sidebar/Sidebar";
import { Header } from "./components/layout/Header/Header";
import { LocationFilterProvider } from "./contexts/LocationFilterContext";
import { useAuth } from "./contexts/AuthContext";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const displayUser = user ? {
    name: user.name,
    role: user.role === "ADMIN" ? "Administrador" : "Usuário",
    avatarUrl: user.avatarUrl ?? undefined,
    isOnline: true,
  } : undefined;
  return (
    <LocationFilterProvider>
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Sidebar fixa */}
      <aside className="w-64 min-w-[16rem] shrink-0">
        <Sidebar user={displayUser} />
      </aside>

      {/* Área principal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          user={displayUser}
          onProfileClick={() => { void logout().catch(() => undefined); }}
        />

        {/* Conteúdo das páginas */}
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </LocationFilterProvider>
  );
}
