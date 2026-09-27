import { Layers } from "lucide-react";

export function SidebarLogo() {
  return (
    <div className="h-16 px-5 flex items-center border-b border-slate-800/80 gap-3">

      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-900/40 text-white shrink-0">
        <Layers className="w-5 h-5 text-blue-100" />
      </div>

      <div className="flex flex-col">

        <div className="flex items-center text-lg font-bold tracking-tight text-white leading-none">
          Stock
          <span className="text-blue-500">Flow</span>
        </div>

        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-1">
          Estoque & Validade
        </span>

      </div>

    </div>
  );
}