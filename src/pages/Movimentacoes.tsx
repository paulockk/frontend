import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ClipboardList, Plus, Search } from "lucide-react";
import { operationsService } from "../services/operations.service";
import { useLocationFilter } from "../contexts/LocationFilterContext";
import type { CatalogProduct, MovementRecord, StoreLocation } from "../types/operations";

const labels: Record<MovementRecord["type"], string> = { ENTRY: "Entrada", EXIT: "Saída", TRANSFER: "Transferência", ADJUSTMENT: "Ajuste" };
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const field = "mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export default function Movimentacoes() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<MovementRecord[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [movementType, setMovementType] = useState<MovementRecord["type"]>("TRANSFER");
  const [selectedSku, setSelectedSku] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const { matchesLocation } = useLocationFilter();

  useEffect(() => {
    void Promise.all([operationsService.listMovements(), operationsService.listProducts(), operationsService.listLocations()])
      .then(([movementItems, productItems, locationItems]) => { setItems(movementItems); setProducts(productItems); setLocations(locationItems.filter((location) => location.status === "ACTIVE")); })
      .catch(() => setError("Não foi possível carregar os dados das movimentações."));
  }, []);
  useEffect(() => { setSearch(searchParams.get("search") ?? ""); }, [searchParams]);

  const filtered = useMemo(() => items.filter((movement) => matchesLocation(movement.origin) || matchesLocation(movement.destination)).filter((movement) => (type === "ALL" || movement.type === type) && `${movement.productName} ${movement.sku} ${movement.batch}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [items, type, search, matchesLocation]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const product = products.find((item) => item.sku === String(data.get("sku")));
    if (!product) { setError("Selecione um produto válido."); return; }
    const origin = String(data.get("origin") || "") || null;
    const destination = String(data.get("destination") || "") || null;
    try {
      const record = await operationsService.createMovement({ type: movementType, productName: product.name, sku: product.sku, quantity: Number(data.get("quantity")), origin, destination, batch: String(data.get("batch") || "—") });
      setItems((current) => [record, ...current]); setFormOpen(false); setError(""); setNotice("Movimentação registrada e estoque atualizado por local.");
      const refreshed = await operationsService.listProducts(); setProducts(refreshed);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar a movimentação."); }
  };

  return <div className="min-w-0 space-y-6 p-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Rastreabilidade · CD e unidades</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Movimentações de estoque</h1><p className="mt-1 text-sm text-slate-500">Acompanhe entradas, saídas, transferências e ajustes por lote.</p></div><button type="button" onClick={() => { setFormOpen(true); setSelectedSku(""); setError(""); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Nova movimentação</button></header>
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {formOpen && <form onSubmit={(event) => void create(event)} className="grid gap-3 rounded-xl border border-blue-200 bg-white p-4 sm:grid-cols-3">
      <label className="text-xs font-semibold text-slate-500">Tipo<select name="type" value={movementType} onChange={(event) => setMovementType(event.target.value as MovementRecord["type"])} className={field}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500 sm:col-span-2">Produto<select required name="sku" value={selectedSku} onChange={(event) => setSelectedSku(event.target.value)} className={field}><option value="" disabled>Selecione o produto</option>{products.filter((product) => product.status === "ACTIVE").map((product) => <option key={product.id} value={product.sku}>{product.name} · {product.sku}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500">Quantidade<input required name="quantity" type="number" min="1" step="1" className={field}/></label>
      {(movementType === "EXIT" || movementType === "TRANSFER") && <label className="text-xs font-semibold text-slate-500">Retirar de<select required name="origin" defaultValue="" className={field}><option value="" disabled>Selecione o local</option>{locations.map((location) => <option key={location.id} value={location.name}>{location.name} · {products.find((product) => product.sku === selectedSku)?.stockByLocation?.[location.id] ?? 0} un</option>)}</select></label>}
      {(movementType === "ENTRY" || movementType === "TRANSFER" || movementType === "ADJUSTMENT") && <label className="text-xs font-semibold text-slate-500">{movementType === "ADJUSTMENT" ? "Local do ajuste" : "Adicionar em"}<select required name="destination" defaultValue="" className={field}><option value="" disabled>Selecione o local</option>{locations.map((location) => <option key={location.id} value={location.name}>{location.name} · {products.find((product) => product.sku === selectedSku)?.stockByLocation?.[location.id] ?? 0} un</option>)}</select></label>}
      <label className="text-xs font-semibold text-slate-500">Lote<input name="batch" className={field}/></label>
      <p className="text-xs text-slate-500 sm:col-span-3">Saídas e transferências descontam a quantidade da origem. Entradas e transferências acrescentam no destino. Ajustes adicionam a quantidade informada.</p>
      <div className="flex justify-end gap-2 sm:col-span-3"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm">Cancelar</button><button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Registrar movimentação</button></div>
    </form>}
    <div className="grid gap-4 sm:grid-cols-4"><MoveMetric title="Movimentações" value={String(filtered.length)} icon={<ClipboardList/>}/><MoveMetric title="Entradas" value={String(filtered.filter((item) => item.type === "ENTRY").length)} icon={<ArrowDownToLine/>}/><MoveMetric title="Transferências" value={String(filtered.filter((item) => item.type === "TRANSFER").length)} icon={<ArrowLeftRight/>}/><MoveMetric title="Pendentes" value={String(filtered.filter((item) => item.status === "PENDING").length)} icon={<ArrowUpFromLine/>}/></div>
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto, SKU ou lote" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm"/></div><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="ALL">Todos os tipos</option>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Data e hora", "Tipo", "Produto / lote", "Quantidade", "Origem", "Destino", "Responsável", "Status"].map((title) => <th key={title} className="px-3 py-3">{title}</th>)}</tr></thead><tbody className="divide-y">{filtered.map((movement) => <tr key={movement.id}><td className="px-3 py-3">{date.format(new Date(movement.date))}</td><td className="px-3 py-3">{labels[movement.type]}</td><td className="px-3 py-3 font-medium">{movement.productName}<p className="text-xs text-slate-400">{movement.sku} · {movement.batch}</p></td><td className="px-3 py-3 font-mono">{movement.quantity}</td><td className="px-3 py-3">{movement.origin ?? "—"}</td><td className="px-3 py-3">{movement.destination ?? "—"}</td><td className="px-3 py-3">{movement.user}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${movement.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{movement.status === "COMPLETED" ? "Concluída" : "Pendente"}</span></td></tr>)}</tbody></table>{!filtered.length && <p className="p-10 text-center text-sm text-slate-500">Nenhuma movimentação encontrada.</p>}</div>
    </section>
  </div>;
}

function MoveMetric({ title, value, icon }: { title: string; value: string; icon: ReactNode }) { return <article className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">{title}<span className="h-4 w-4 text-blue-600">{icon}</span></div><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></article>; }
