import { Outlet } from "react-router";

import { Sidebar } from "./components/layout/Sidebar/Sidebar";
import { Header } from "./components/layout/Header/Header";
import { LocationFilterProvider } from "./contexts/LocationFilterContext";

export default function AppLayout() {
  return (
    <LocationFilterProvider>
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Sidebar fixa */}
      <aside className="w-64 min-w-[16rem] shrink-0">
        <Sidebar />
      </aside>

      {/* Área principal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Conteúdo das páginas */}
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </LocationFilterProvider>
  );
}
