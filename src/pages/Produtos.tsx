import { Fragment, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Download, Package, Plus, Search, Pencil, Tags, ChevronDown, Upload } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { operationsService } from "../services/operations.service";
import type { CatalogProduct, ProductStockLot, StoreLocation } from "../types/operations";
import { QuickProductForm, quickFormToProduct, type QuickProductFormData } from "../components/products/QuickProductForm";
import { VmPayImportDialog } from "../components/products/VmPayImportDialog";
import { useAuth } from "../contexts/AuthContext";
import { useLocationFilter } from "../contexts/LocationFilterContext";
import { expiryService } from "../services/expiry.service";
import { formatIsoDateAsBrazilian, maskBrazilianDate, parseBrazilianDate } from "../utils/date";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export default function Produtos() {
  const { user } = useAuth();
  const { selectedLocationId } = useLocationFilter();
  const isAdmin = user?.role === "ADMIN";
  const canManageProducts = isAdmin || Boolean(user?.permissions.includes("products.manage"));
  const canManageStock = isAdmin || Boolean(user?.permissions.includes("stock.manage"));
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [stockLots, setStockLots] = useState<ProductStockLot[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [quickFormOpen, setQuickFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBrand, setBulkBrand] = useState("");
  const [bulkCost, setBulkCost] = useState("");
  const [bulkSale, setBulkSale] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // Carrega o catálogo e os locais uma vez para preencher a tabela e os editores de estoque.
  useEffect(() => { void Promise.all([operationsService.listProducts(), operationsService.listLocations(), operationsService.listStockLots()]).then(([products, stores, lots]) => { setItems(products); setLocations(stores); setStockLots(lots); }); }, []);

  // A busca do cabeçalho pode abrir esta página já com um termo preenchido na URL.
  useEffect(() => { setSearch(searchParams.get("search") ?? ""); }, [searchParams]);

  // Aplica busca e categoria sem alterar a lista original recebida do serviço.
  const locationItems = useMemo(() => items.filter((product) => selectedLocationId === "all" || product.linkedLocationIds?.includes(selectedLocationId) || (product.stockByLocation?.[selectedLocationId] ?? 0) > 0), [items, selectedLocationId]);
  const filtered = useMemo(() => locationItems.filter((p) => (category === "ALL" || p.category === category) && `${p.name} ${p.sku} ${p.barcode} ${p.brand} ${p.supplier ?? ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [locationItems, search, category]);
  const categories = [...new Set(locationItems.map((p) => p.category))];

  const saveProduct = async (data: QuickProductFormData) => {
    const product = quickFormToProduct(data, "pending");
    // Estoque inicial é enviado por local, pois cada loja pode começar com uma quantidade diferente.
    const initialStockByLocation = Object.entries(data.initialStockByLocation).map(([locationId, quantity]) => ({ locationId, quantity: Number(quantity) || 0 }));
    const saved = await operationsService.createProduct(product, initialStockByLocation);
    setItems((current) => [saved, ...current]); setQuickFormOpen(false); setNotice(`Produto “${saved.name}” cadastrado com sucesso.`);
  };

  // Salva os campos editáveis e substitui o produto na tabela pelo retorno atualizado.
  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing) return;
    const data = new FormData(event.currentTarget);
    const updated = await operationsService.updateProduct({
      ...editing, name: String(data.get("name")), brand: String(data.get("brand")), supplier: String(data.get("supplier")), category: String(data.get("category")),
      costPrice: Number(String(data.get("costPrice")).replace(",", ".")), salePrice: Number(String(data.get("salePrice")).replace(",", ".")),
      minimumStock: Number(data.get("minimumStock")), shelfLifeDays: Number(data.get("shelfLifeDays")), tracksExpiration: Number(data.get("shelfLifeDays")) > 0, status: data.get("status") as CatalogProduct["status"],
    });
    setItems((current) => current.map((item) => item.id === updated.id ? updated : item)); setEditing(null); setNotice(`Produto “${updated.name}” atualizado.`);
  };

  const saveLotExpiry = async (lot: ProductStockLot, expiryDate: string) => {
    await expiryService.updateExpiryDate(lot.batchId, expiryDate);
    const [products, lots] = await Promise.all([operationsService.listProducts(), operationsService.listStockLots()]);
    const refreshedLot = lots.find((item) => item.batchId === lot.batchId);
    if (!refreshedLot || refreshedLot.expiryDate?.slice(0, 10) !== expiryDate) {
      setStockLots((current) => current.map((item) => item.batchId === lot.batchId ? { ...item, expiryDate } : item));
      throw new Error("A API aceitou a alteração, mas ainda retornou a validade antiga ao recarregar o lote.");
    }
    setItems(products);
    setStockLots(lots);
    setNotice(`Validade do lote ${lot.batchNumber ?? lot.batchId} atualizada.`);
  };

  // Atualiza preços em lote por marca ou para o catálogo inteiro.
  const applyBulkPrices = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Permite atualizar custo, venda ou ambos, sem sobrescrever o preço que ficou em branco.
    const targets = items.filter((item) => bulkBrand === "ALL" || item.brand === bulkBrand);
    const prices = { ...(bulkCost !== "" ? { costPrice: Number(bulkCost.replace(",", ".")) } : {}), ...(bulkSale !== "" ? { salePrice: Number(bulkSale.replace(",", ".")) } : {}) };
    if (!targets.length || !Object.keys(prices).length) return;
    const updated = await operationsService.updatePrices(targets.map((item) => item.id), prices);
    setItems((current) => current.map((item) => updated.find((candidate) => candidate.id === item.id) ?? item));
    setBulkOpen(false); setBulkCost(""); setBulkSale(""); setNotice(`Preços atualizados para ${updated.length} produto(s).`);
  };

  return <div className="min-w-0 space-y-6 p-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Catálogo · {locationItems.length} produtos neste local</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Produtos</h1><p className="mt-1 text-sm text-slate-500">Gerencie o catálogo, códigos de barras, custos e regras PEPS.</p></div><div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => { const csv = ["SKU;Código de barras;Produto;Categoria;Custo;Venda", ...filtered.map((p) => [p.sku,p.barcode,p.name,p.category,p.costPrice,p.salePrice].join(";"))].join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "produtos.csv"; a.click(); URL.revokeObjectURL(a.href); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Download className="h-4 w-4"/>Exportar</button>
      {canManageProducts && <button type="button" onClick={() => { setBulkOpen((open) => !open); setNotice(null); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Tags className="h-4 w-4"/>Editar preços em lote</button>}
      {canManageProducts && <button type="button" onClick={() => { setImportOpen(true); setNotice(null); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Upload className="h-4 w-4"/>Importar VMpay</button>}
      {canManageProducts && <button type="button" onClick={() => { setQuickFormOpen(true); setNotice(null); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Novo produto</button>}
    </div></header>

    <div className="grid gap-4 sm:grid-cols-3"><Metric icon={<Package className="h-4 w-4"/>} label="Produtos cadastrados" value={String(locationItems.length)} /><Metric label="Categorias" value={String(categories.length)} /><Metric label="Itens em revisão" value={String(locationItems.filter((p) => p.status === "REVIEW").length)} /></div>
    {quickFormOpen && <QuickProductForm onClose={() => setQuickFormOpen(false)} onSave={saveProduct} canSetInitialStock={canManageStock} />}
    {importOpen && <VmPayImportDialog products={items} locations={locations} onClose={() => setImportOpen(false)} onImported={(created) => { setItems((current) => [...created.filter((item) => !current.some((existing) => existing.id === item.id)), ...current.map((item) => created.find((updated) => updated.id === item.id) ?? item)]); setNotice(`${created.length} produto(s) importado(s) ou vinculados ao VMpay.`); }} />}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

    {bulkOpen && <form onSubmit={(event) => void applyBulkPrices(event)} className="grid gap-3 rounded-xl border border-blue-200 bg-white p-4 sm:grid-cols-4">
      <label className="text-xs font-semibold text-slate-500">Aplicar para<select required value={bulkBrand} onChange={(event) => setBulkBrand(event.target.value)} className={inputClass}><option value="">Selecione a marca</option><option value="ALL">Todos os produtos</option>{[...new Set(items.map((item) => item.brand).filter(Boolean))].map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500">Novo custo (R$)<input inputMode="decimal" value={bulkCost} onChange={(event) => setBulkCost(event.target.value)} placeholder="Manter atual" className={inputClass}/></label>
      <label className="text-xs font-semibold text-slate-500">Novo preço de venda (R$)<input inputMode="decimal" value={bulkSale} onChange={(event) => setBulkSale(event.target.value)} placeholder="Manter atual" className={inputClass}/></label>
      <div className="flex items-end gap-2"><button disabled={!bulkBrand || (!bulkCost && !bulkSale)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Aplicar preços</button><button type="button" onClick={() => setBulkOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">Cancelar</button></div>
      <p className="text-xs text-slate-500 sm:col-span-4">Escolha uma marca para atualizar todos os produtos dela, como Coca-Cola. Preencha apenas os preços que deseja alterar.</p>
    </form>}

    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={(event) => void saveEdit(event)} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
      <header className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Editar produto</h2><p className="text-sm text-slate-500">Alterações somente em {editing.name}.</p></div><button type="button" onClick={() => setEditing(null)} aria-label="Fechar" className="text-slate-400">✕</button></header>
      <div className="grid gap-3 sm:grid-cols-2">{[["name","Nome",editing.name],["brand","Marca",editing.brand],["supplier","Fornecedor",editing.supplier ?? ""],["category","Categoria",editing.category],["costPrice","Preço de custo",String(editing.costPrice)],["salePrice","Preço de venda",String(editing.salePrice)],["minimumStock","Estoque mínimo",String(editing.minimumStock)],["shelfLifeDays","Shelf life (dias)",String(editing.shelfLifeDays)]].map(([name,label,value]) => <label key={name} className="block text-xs font-semibold text-slate-500">{label}<input name={name} defaultValue={value} required={name !== "supplier"} className={inputClass}/></label>)}
        <label className="block text-xs font-semibold text-slate-500">Status<select name="status" defaultValue={editing.status} className={inputClass}><option value="ACTIVE">Ativo</option><option value="REVIEW">Em revisão</option><option value="INACTIVE">Inativo</option></select></label>
      </div><section className="space-y-2 border-t border-slate-100 pt-4"><div><h3 className="text-sm font-bold text-slate-800">Validade por lote</h3><p className="text-xs text-slate-500">Cada lote pode ter uma data diferente, mesmo no mesmo local.</p></div>{stockLots.filter((lot) => lot.productId === editing.id).length ? stockLots.filter((lot) => lot.productId === editing.id).map((lot) => <ProductLotExpiryEditor key={lot.batchId} lot={lot} canEdit={canManageStock} onSave={(date) => saveLotExpiry(lot, date)} />) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Nenhum lote com saldo para este produto.</p>}</section><footer className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">Cancelar</button><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Salvar alterações</button></footer>
    </form></div>}

    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input aria-label="Buscar produtos" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, SKU ou código de barras" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm"/></div><select aria-label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="ALL">Todas as categorias</option>{categories.map((x) => <option key={x}>{x}</option>)}</select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr>{["SKU / EAN","Produto / Marca","Categoria","Locais","Custo","Venda","Margem","Próxima validade","Status","Ações"].map((x) => <th key={x} className={`px-3 py-3 ${["Custo","Venda","Margem"].includes(x) ? "text-right" : ""}`}>{x}</th>)}</tr></thead><tbody className="divide-y">{filtered.map((p) => <Fragment key={p.id}><tr><td className="px-3 py-3 font-mono text-xs">{p.sku}<p className="text-slate-400">{p.barcode}</p></td><td className="px-3 py-3 font-medium">{p.name}<p className="text-xs text-slate-400">{p.brand}</p></td><td className="px-3 py-3">{p.category}</td><td className="px-3 py-3"><button type="button" aria-expanded={Boolean(expandedProducts[p.id])} onClick={() => setExpandedProducts((current) => ({ ...current, [p.id]: !current[p.id] }))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{locations.filter((location) => (p.stockByLocation?.[location.id] ?? 0) > 0 || p.linkedLocationIds?.includes(location.id)).length} locais<ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedProducts[p.id] ? "rotate-180" : ""}`}/></button></td><td className="px-3 py-3 text-right">{brl.format(p.costPrice)}</td><td className="px-3 py-3 text-right">{brl.format(p.salePrice)}</td><td className="px-3 py-3 text-right text-emerald-700">{p.salePrice ? (((p.salePrice-p.costPrice)/p.salePrice)*100).toFixed(1) : "0.0"}%</td><td className="px-3 py-3 text-center">{(() => { const nextExpiry = stockLots.filter((lot) => lot.productId === p.id && lot.expiryDate).map((lot) => lot.expiryDate!).sort()[0] ?? p.expiryDate; return nextExpiry ? shortDate.format(new Date(`${nextExpiry}T00:00:00Z`)) : "-"; })()}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${p.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : p.status === "REVIEW" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{p.status === "ACTIVE" ? "Ativo" : p.status === "REVIEW" ? "Em revisão" : "Inativo"}</span></td><td className="px-3 py-3"><button type="button" onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5"/>Editar</button></td></tr>{expandedProducts[p.id] && <tr><td colSpan={10} className="border-b bg-slate-50/70 p-4"><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{locations.filter((location) => selectedLocationId === "all" || location.id === selectedLocationId).map((location) => <article key={location.id} className="rounded-lg border border-slate-200 bg-white p-3"><h3 className="text-sm font-bold text-slate-800">{location.name}</h3><p className="text-xs text-slate-500">Estoque atual</p><p className="mt-1 font-mono text-lg font-semibold text-slate-800">{p.stockByLocation?.[location.id] ?? 0}</p></article>)}</div></div></td></tr>}</Fragment>)}</tbody></table>{!filtered.length && <p className="p-10 text-center text-sm text-slate-500">Nenhum produto encontrado.</p>}</div>
    </section>
  </div>;
}

// Cartão pequeno usado no resumo do catálogo.
function Metric({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) { return <article className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex justify-between text-xs font-semibold uppercase text-slate-500">{label}<span className="text-blue-600">{icon}</span></div><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></article>; }

function ProductLotExpiryEditor({ lot, canEdit, onSave }: { lot: ProductStockLot; canEdit: boolean; onSave: (expiryDate: string) => Promise<void> }) {
  const [expiryDate, setExpiryDate] = useState(formatIsoDateAsBrazilian(lot.expiryDate));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setExpiryDate(formatIsoDateAsBrazilian(lot.expiryDate)); }, [lot.expiryDate]);
  const save = async () => {
    const isoDate = parseBrazilianDate(expiryDate);
    if (!isoDate) { setMessage("Digite uma data válida no formato dd/mm/aaaa."); return; }
    setSaving(true); setMessage("");
    try { await onSave(isoDate); setMessage("Validade salva."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Não foi possível salvar a validade."); }
    finally { setSaving(false); }
  };
  return <div className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3"><div className="min-w-40 flex-1"><p className="text-sm font-semibold text-slate-700">Lote {lot.batchNumber ?? "sem identificação"}</p><p className="text-xs text-slate-500">{lot.location} · {lot.quantity} {lot.unit}</p></div><label className="text-xs font-semibold text-slate-500">Validade<input type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} required value={expiryDate} disabled={!canEdit || saving} onChange={(event) => setExpiryDate(maskBrazilianDate(event.target.value))} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>{canEdit && <button type="button" onClick={() => void save()} disabled={expiryDate.length !== 10 || saving} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Salvando…" : "Salvar validade"}</button>}<p role="status" className="w-full text-xs text-slate-600">{message}</p></div>;
}

