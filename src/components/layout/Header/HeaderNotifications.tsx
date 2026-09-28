import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Clock3, MapPin } from "lucide-react";
import { expiryService } from "../../../services/expiry.service";
import type { ExpiryLot } from "../../../types/expiry";

const readStorageKey = "readExpiryNotifications";

export const HeaderNotifications = () => {
  const [open, setOpen] = useState(false);
  const [lots, setLots] = useState<ExpiryLot[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try { return JSON.parse(window.localStorage.getItem(readStorageKey) ?? "[]") as string[]; }
    catch { return []; }
  });

  useEffect(() => {
    let active = true;
    void expiryService.list({ search: "", location: "ALL", category: "ALL", severity: "ALL", page: 1, pageSize: 50 })
      .then((result) => { if (active) setLots(result.items.filter((lot) => lot.daysRemaining <= 15)); })
      .catch(() => { if (active) setLots([]); });
    return () => { active = false; };
  }, []);

  const unreadCount = useMemo(() => lots.filter((lot) => !readIds.includes(lot.id)).length, [lots, readIds]);
  const markAllRead = () => {
    const next = [...new Set([...readIds, ...lots.map((lot) => lot.id)])];
    setReadIds(next);
    window.localStorage.setItem(readStorageKey, JSON.stringify(next));
  };

  return <div className="relative">
    <button type="button" aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((value) => !value)} className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
    </button>
    {open && <section role="dialog" aria-label="Notificações de validade" className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-bold text-slate-800">Notificações</h2><p className="text-xs text-slate-500">Lotes vencidos ou próximos do vencimento</p></div><button type="button" onClick={markAllRead} disabled={!unreadCount} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 disabled:text-slate-300"><CheckCheck className="h-4 w-4"/>Marcar lidas</button></header>
      <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">{lots.length ? lots.map((lot) => <li key={lot.id} className={`px-4 py-3 ${readIds.includes(lot.id) ? "bg-white" : "bg-blue-50/50"}`}><p className="text-sm font-semibold text-slate-800">{lot.productName}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5"/>{lot.location}<span>·</span>{lot.quantity} {lot.unit}</p><p className={`mt-1 flex items-center gap-1 text-xs font-medium ${lot.daysRemaining < 0 ? "text-red-700" : "text-amber-700"}`}><Clock3 className="h-3.5 w-3.5"/>{lot.daysRemaining < 0 ? `Vencido há ${Math.abs(lot.daysRemaining)} dias` : lot.daysRemaining === 0 ? "Vence hoje" : `Vence em ${lot.daysRemaining} dias`}</p></li>) : <li className="px-4 py-8 text-center text-sm text-slate-500">Nenhum alerta de validade no momento.</li>}</ul>
      {lots.length > 0 && <footer className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">Exibindo até 50 lotes prioritários.</footer>}
    </section>}
  </div>;
};

export default HeaderNotifications;
