import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Plus, RefreshCw, Store, Warehouse, Pencil, Trash2, X, Save } from "lucide-react";
import { operationsService } from "../services/operations.service";
import { useLocationFilter } from "../contexts/LocationFilterContext";
import type { StoreLocation } from "../types/operations";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fieldClass = "mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export default function Locais() {
  const [items, setItems] = useState<StoreLocation[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StoreLocation | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const { matchesLocation, refreshLocations } = useLocationFilter();

  useEffect(() => { void operationsService.listLocations().then(setItems).catch(() => setError("Não foi possível carregar os locais.")); }, []);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const created = await operationsService.createLocation({ name: String(data.get("name")).trim(), address: String(data.get("address")).trim(), type: data.get("type") as StoreLocation["type"], status: "ACTIVE" });
      setItems((current) => [created, ...current]); await refreshLocations(); setFormOpen(false); setNotice(`Local “${created.name}” cadastrado.`); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível cadastrar o local."); }
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    try {
      const updated = await operationsService.updateLocation({ ...editing, name: String(data.get("name")).trim(), address: String(data.get("address")).trim() });
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item)); await refreshLocations(); setEditing(null); setError(""); setNotice(`Local “${updated.name}” atualizado.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o local."); }
  };

  const remove = async (location: StoreLocation) => {
    if (location.type === "WAREHOUSE" && location.name === "CD") return;
    const inventoryWarning = location.skuCount > 0 || location.stockValue > 0
      ? `\n\nEste local registra ${location.skuCount} SKU(s) e ${money.format(location.stockValue)} em estoque. A exclusão pode ser impedida se houver estoque ou movimentações vinculadas.`
      : "";
    if (!window.confirm(`Excluir o local “${location.name}”?${inventoryWarning}\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await operationsService.deleteLocation(location.id);
      setItems((current) => current.filter((item) => item.id !== location.id)); await refreshLocations(); setError(""); setNotice(`Local “${location.name}” excluído.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir o local. Verifique se há estoque ou movimentações vinculadas."); }
  };

  const visibleItems = items.filter((location) => matchesLocation(location.name));

  return <div className="min-w-0 space-y-6 p-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Rede de distribuição</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Locais e pontos de venda</h1><p className="mt-1 text-sm text-slate-500">Visão consolidada do CD, mercadinhos e vending machines.</p></div><button type="button" onClick={() => setFormOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Cadastrar local</button></header>
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {formOpen && <form onSubmit={(event) => void create(event)} className="grid gap-3 rounded-xl border border-blue-200 bg-white p-4 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-500">Nome<input name="name" required maxLength={100} className={fieldClass}/></label><label className="text-xs font-semibold text-slate-500">Endereço / descrição<input name="address" required maxLength={200} className={fieldClass}/></label><label className="text-xs font-semibold text-slate-500">Tipo<select name="type" className={fieldClass}><option value="MARKET">Mercadinho</option><option value="WAREHOUSE">Centro de distribuição</option><option value="VENDING_MACHINE">Vending machine</option></select></label><div className="flex justify-end gap-2 sm:col-span-3"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm">Cancelar</button><button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Salvar local</button></div></form>}
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Locais exibidos" value={String(visibleItems.length)}/><Stat label="Ativos" value={String(visibleItems.filter((item) => item.status === "ACTIVE").length)}/><Stat label="Valor em estoque" value={money.format(visibleItems.reduce((sum, item) => sum + item.stockValue, 0))}/></div>
    {visibleItems.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Nenhum local corresponde à seleção atual.</p>}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleItems.map((location) => {
      const isMainWarehouse = location.type === "WAREHOUSE" && location.name === "CD";
      return <article key={location.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-start justify-between"><span className="rounded-lg bg-blue-50 p-2 text-blue-700">{location.type === "WAREHOUSE" ? <Warehouse className="h-5 w-5"/> : <Store className="h-5 w-5"/>}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${location.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{location.status === "ACTIVE" ? "Ativo" : "Manutenção"}</span></div>
        <div><h2 className="text-lg font-bold text-slate-900">{location.name}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4"/>{location.address}</p></div>
        <div className="grid grid-cols-2 gap-3 border-y border-slate-100 py-3"><Info label="SKUs ativos" value={location.skuCount.toLocaleString("pt-BR")}/><Info label="Valor em estoque" value={money.format(location.stockValue)}/></div>
        <div><div className="mb-1 flex justify-between text-xs text-slate-500"><span>Capacidade utilizada</span><b>{location.capacity}%</b></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${location.capacity}%` }}/></div></div>
        <p className="flex items-center gap-1 text-xs text-slate-400"><RefreshCw className="h-3 w-3"/>Sincronizado {location.lastSync}</p>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => { setEditing(location); setError(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5"/>Editar</button><button type="button" disabled={isMainWarehouse} title={isMainWarehouse ? "O CD principal não pode ser excluído" : "Excluir local"} onClick={() => void remove(location)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5"/>Excluir</button></div>
      </article>;
    })}</section>
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={(event) => void saveEdit(event)} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-xl"><header className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Editar local</h2><p className="text-sm text-slate-500">Atualize o nome ou a descrição do local.</p></div><button type="button" onClick={() => setEditing(null)} aria-label="Fechar" className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5"/></button></header><label className="block text-xs font-semibold text-slate-500">Nome<input name="name" defaultValue={editing.name} required maxLength={100} className={fieldClass}/></label><label className="block text-xs font-semibold text-slate-500">Endereço / descrição<input name="address" defaultValue={editing.address} required maxLength={200} className={fieldClass}/></label><footer className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">Cancelar</button><button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Save className="h-4 w-4"/>Salvar</button></footer></form></div>}
  </div>;
}

function Stat({ label, value }: { label: string; value: string }) { return <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></article>; }
function Info({ label, value }: { label: string; value: string | number }) { return <div><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>; }
