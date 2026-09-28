import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Download,
  FileText,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { operationsService } from "../services/operations.service";
import { expiryService } from "../services/expiry.service";
import { useLocationFilter } from "../contexts/LocationFilterContext";
import type { CatalogProduct, MovementRecord, SaleTransaction, StoreLocation } from "../types/operations";
import type { ExpiryLot } from "../types/expiry";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const qtyFormat = new Intl.NumberFormat("pt-BR");
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const selectClass = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700";

interface ReportData {
  products: CatalogProduct[];
  locations: StoreLocation[];
  movements: MovementRecord[];
  sales: SaleTransaction[];
  expiryLots: ExpiryLot[];
}

interface DetailRow {
  product: CatalogProduct;
  location: StoreLocation;
  quantity: number;
  value: number;
  expiryDate: string;
}

export default function Relatorios() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30");
  const [locationId, setLocationId] = useState("all");
  const navigate = useNavigate();
  const { selectedLocationId } = useLocationFilter();

  // Mantém os relatórios sincronizados com o seletor global de local.
  useEffect(() => {
    setLocationId(selectedLocationId);
  }, [selectedLocationId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    // Carrega todas as fontes em conjunto para montar os indicadores com a mesma consulta.
    void Promise.all([
      operationsService.listProducts(),
      operationsService.listLocations(),
      operationsService.listMovements(),
      operationsService.listSales(),
      expiryService.list({ search: "", location: "ALL", category: "ALL", severity: "ALL", page: 1, pageSize: 500 }),
    ]).then(([products, locations, movements, sales, expiry]) => {
      if (active) setData({ products, locations, movements, sales, expiryLots: expiry.items });
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os relatórios.");
    }).finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, []);

  const selectedLocation = data?.locations.find((location) => location.id === locationId);
  const inLocation = (name: string | null | undefined) => locationId === "all" || (!!selectedLocation && name === selectedLocation.name);

  // A seleção de período afeta vendas e movimentações; o estoque permanece como posição atual.
  const cutoff = useMemo(() => {
    if (period === "all") return null;
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - Number(period)); return date;
  }, [period]);
  const inPeriod = (value: string) => !cutoff || new Date(value) >= cutoff;

  // Transforma o estoque por produto em linhas próprias por local para a tabela e o CSV.
  const scopedDetails = useMemo<DetailRow[]>(() => {
    if (!data) return [];
    const scopedLocations = locationId === "all" ? data.locations : data.locations.filter((location) => location.id === locationId);
    return data.products.flatMap((product) => scopedLocations.map((location) => {
      const quantity = product.stockByLocation?.[location.id] ?? 0;
      return { product, location, quantity, value: quantity * product.costPrice, expiryDate: product.expiryByLocation?.[location.id] ?? product.expiryDate ?? "" };
    }));
  }, [data, locationId]);
  const filteredMovements = useMemo(() => data?.movements.filter((movement) => (inLocation(movement.origin) || inLocation(movement.destination)) && inPeriod(movement.date)) ?? [], [data, locationId, period, selectedLocation, cutoff]);
  const filteredSales = useMemo(() => data?.sales.filter((sale) => inLocation(sale.location) && inPeriod(sale.date)) ?? [], [data, locationId, period, selectedLocation, cutoff]);
  const filteredExpiry = useMemo(() => data?.expiryLots.filter((lot) => inLocation(lot.location)) ?? [], [data, locationId, selectedLocation]);

  const totalUnits = scopedDetails.reduce((sum, row) => sum + row.quantity, 0);
  const stockValue = scopedDetails.reduce((sum, row) => sum + row.value, 0);
  const productTotals = data?.products.filter((product) => product.status === "ACTIVE").map((product) => ({ product, quantity: scopedDetails.filter((row) => row.product.id === product.id).reduce((sum, row) => sum + row.quantity, 0) })) ?? [];
  // O mínimo é global; por isso, num local individual só se destaca saldo zerado.
  const lowStock = productTotals.filter(({ product, quantity }) => locationId === "all" ? quantity < product.minimumStock : quantity === 0);
  const unitsBelowMinimum = lowStock.reduce((sum, item) => sum + Math.max(0, item.product.minimumStock - item.quantity), 0);
  const expiring = filteredExpiry.filter((lot) => lot.daysRemaining <= 15);
  const criticalExpiry = filteredExpiry.filter((lot) => lot.daysRemaining <= 7);
  const completedSales = filteredSales.filter((sale) => sale.status === "COMPLETED");
  const salesValue = completedSales.reduce((sum, sale) => sum + sale.total, 0);
  const locationLabel = selectedLocation?.name ?? "Todos os locais";

  const reportCards = [
    { id: "stock", badge: "INVENTÁRIO", title: "Estoque por produto e local", description: `Posição de estoque e custo de aquisição para ${locationLabel}.`, metricLabel: "Unidades em estoque", metric: qtyFormat.format(totalUnits), secondaryLabel: "Valor de aquisição", secondaryMetric: brl.format(stockValue), path: "/estoque", icon: <Package className="h-4 w-4"/> },
    { id: "replenishment", badge: "REPOSIÇÃO", title: locationId === "all" ? "Produtos abaixo do mínimo" : "Produtos sem estoque no local", description: locationId === "all" ? "Compara a quantidade total disponível com o mínimo cadastrado para cada produto." : `Produtos sem unidades em ${locationLabel}. O estoque mínimo é global e não é comparado por unidade.`, metricLabel: locationId === "all" ? "Produtos em atenção" : "Produtos sem estoque", metric: qtyFormat.format(lowStock.length), secondaryLabel: locationId === "all" ? "Unidades para atingir o mínimo" : "Local selecionado", secondaryMetric: locationId === "all" ? qtyFormat.format(unitsBelowMinimum) : locationLabel, path: "/estoque", icon: <AlertTriangle className="h-4 w-4"/> },
    { id: "expiry", badge: "VALIDADES", title: "Lotes próximos do vencimento", description: "Lotes vencidos ou com vencimento nos próximos 15 dias.", metricLabel: "Lotes prioritários", metric: qtyFormat.format(expiring.length), secondaryLabel: "Custo desses lotes", secondaryMetric: brl.format(expiring.reduce((sum, lot) => sum + lot.totalCost, 0)), path: "/validades", icon: <ShieldCheck className="h-4 w-4"/> },
    { id: "audit", badge: "MOVIMENTAÇÕES", title: "Movimentações no período", description: "Entradas, saídas, transferências e ajustes registrados no intervalo selecionado.", metricLabel: "Movimentações", metric: qtyFormat.format(filteredMovements.length), secondaryLabel: "Transferências", secondaryMetric: qtyFormat.format(filteredMovements.filter((item) => item.type === "TRANSFER").length), path: "/movimentacoes", icon: <ArrowLeftRight className="h-4 w-4"/> },
    { id: "sales", badge: "VENDAS", title: "Vendas concluídas", description: "Receita calculada apenas com transações concluídas no período selecionado.", metricLabel: "Transações", metric: qtyFormat.format(completedSales.length), secondaryLabel: "Receita registrada", secondaryMetric: brl.format(salesValue), path: "/vendas", icon: <ShoppingCart className="h-4 w-4"/> },
  ];

  const exportSummary = () => {
    if (!data) return;
    // Exporta os mesmos registros filtrados que aparecem na tela.
    const rows: (string | number)[][] = [["Tipo", "Produto / relatório", "Local", "Detalhe", "Quantidade", "Valor", "Data"]];
    rows.push(["Resumo", "Unidades em estoque", locationLabel, "", totalUnits, stockValue, ""]);
    rows.push(["Resumo", locationId === "all" ? "Produtos abaixo do mínimo" : "Produtos sem estoque no local", locationLabel, "", lowStock.length, "", ""]);
    rows.push(["Resumo", "Lotes vencidos ou próximos (15 dias)", locationLabel, "", expiring.length, expiring.reduce((sum, lot) => sum + lot.totalCost, 0), ""]);
    rows.push(["Resumo", "Vendas concluídas", locationLabel, "", completedSales.length, salesValue, ""]);
    scopedDetails.forEach((row) => rows.push(["Estoque", `${row.product.name} (${row.product.sku})`, row.location.name, "Quantidade por local", row.quantity, row.value, row.expiryDate]));
    filteredExpiry.forEach((lot) => rows.push(["Validade", lot.productName, lot.location, `Lote ${lot.batchNumber}; ${lot.daysRemaining} dias`, lot.quantity, lot.totalCost, lot.expiryDate]));
    filteredMovements.forEach((movement) => rows.push(["Movimentação", `${movement.productName} (${movement.sku})`, movement.origin ?? movement.destination ?? "", `${movement.type}; ${movement.batch}; destino ${movement.destination ?? "—"}`, movement.quantity, "", movement.date]));
    filteredSales.forEach((sale) => rows.push(["Venda", sale.receipt, sale.location, `${sale.status}; ${sale.items}`, "", sale.total, sale.date]));
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "relatorio-estoque.csv"; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <div className="min-w-0 space-y-6 p-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Centro de dados e conformidade</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Relatórios e inteligência logística</h1><p className="mt-1 text-sm text-slate-500">Indicadores calculados a partir do estoque, lotes, movimentações e vendas.</p></div><div className="flex gap-2 print:hidden"><button type="button" disabled={!data} onClick={exportSummary} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><Download className="h-4 w-4"/>Exportar CSV</button><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><FileText className="h-4 w-4"/>Imprimir / PDF</button></div></header>

    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 print:hidden"><label className="text-xs font-semibold text-slate-500">Local<select value={locationId} onChange={(event) => setLocationId(event.target.value)} className={`ml-2 ${selectClass}`}><option value="all">Todos os locais</option>{data?.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">Período<select value={period} onChange={(event) => setPeriod(event.target.value)} className={`ml-2 ${selectClass}`}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todo o histórico</option></select></label><span className="text-xs text-slate-400">Validades mostram a posição atual; o período afeta vendas e movimentações.</span></section>

    {error && <div role="alert" className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => window.location.reload()} className="font-semibold">Tentar novamente</button></div>}
    {loading && <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin"/>Carregando dados dos relatórios...</div>}

    {!loading && data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi icon={<TrendingUp/>} label="Valor em estoque" value={brl.format(stockValue)} sub={locationLabel}/><Kpi icon={<AlertTriangle/>} label={locationId === "all" ? "Produtos abaixo do mínimo" : "Produtos sem estoque no local"} value={String(lowStock.length)} sub={locationId === "all" ? "Comparado ao mínimo global" : locationLabel}/><Kpi icon={<ShieldCheck/>} label="Validades prioritárias" value={String(criticalExpiry.length)} sub="Vencidos ou até 7 dias"/><Kpi icon={<ShoppingCart/>} label="Receita no período" value={brl.format(salesValue)} sub={`${completedSales.length} vendas concluídas`}/></div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reportCards.map((report) => <article key={report.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-xs"><span className="flex w-fit items-center gap-1.5 rounded border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold tracking-wide text-blue-700">{report.icon}{report.badge}</span><h2 className="mt-3 font-bold text-slate-900">{report.title}</h2><p className="mt-1 min-h-10 text-sm leading-relaxed text-slate-500">{report.description}</p><div className="my-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"><div><p className="text-[10px] font-semibold uppercase text-slate-400">{report.metricLabel}</p><p className="mt-1 text-sm font-bold text-slate-800">{report.metric}</p></div><div><p className="text-[10px] font-semibold uppercase text-slate-400">{report.secondaryLabel}</p><p className="mt-1 text-sm font-bold text-blue-700">{report.secondaryMetric}</p></div></div><button type="button" onClick={() => navigate(report.path)} className="mt-auto inline-flex items-center justify-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-semibold text-blue-700 hover:text-blue-900">Abrir seção<ArrowRight className="h-3.5 w-3.5"/></button></article>)}</section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><header className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Estoque por produto e local</h2><p className="mt-1 text-xs text-slate-500">Quantidade atual, custo de aquisição e próxima validade cadastrada.</p></header><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Produto / SKU", "Local", "Quantidade", "Custo do estoque", "Validade"].map((title) => <th key={title} className="px-4 py-3">{title}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{scopedDetails.map((row) => <tr key={`${row.product.id}-${row.location.id}`}><td className="px-4 py-3 font-medium text-slate-800">{row.product.name}<p className="text-xs text-slate-400">{row.product.sku}</p></td><td className="px-4 py-3 text-slate-600">{row.location.name}</td><td className="px-4 py-3 font-mono">{qtyFormat.format(row.quantity)}</td><td className="px-4 py-3">{brl.format(row.value)}</td><td className="px-4 py-3">{row.expiryDate ? dateFormat.format(new Date(`${row.expiryDate}T00:00:00Z`)) : "—"}</td></tr>)}</tbody></table></div></section>

      <section className="grid gap-4 lg:grid-cols-2"><article className="overflow-hidden rounded-xl border border-slate-200 bg-white"><header className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Validades prioritárias</h2><p className="mt-1 text-xs text-slate-500">Lotes vencidos ou com até 15 dias restantes.</p></header>{expiring.length ? <ul className="divide-y divide-slate-100">{expiring.slice(0, 6).map((lot) => <li key={lot.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-semibold text-slate-800">{lot.productName}</p><p className="text-xs text-slate-500">{lot.location} · lote {lot.batchNumber}</p></div><span className="whitespace-nowrap text-xs font-semibold text-amber-700">{lot.daysRemaining < 0 ? `Vencido há ${Math.abs(lot.daysRemaining)}d` : `${lot.daysRemaining} dias`}</span></li>)}</ul> : <p className="p-6 text-sm text-slate-500">Nenhum lote prioritário nos locais selecionados.</p>}</article>
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white"><header className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Movimentações recentes</h2><p className="mt-1 text-xs text-slate-500">{filteredMovements.length} registros no período.</p></header>{filteredMovements.length ? <ul className="divide-y divide-slate-100">{filteredMovements.slice(0, 6).map((movement) => <li key={movement.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-semibold text-slate-800">{movement.productName}</p><p className="text-xs text-slate-500">{movement.type} · {movement.origin ?? "—"} → {movement.destination ?? "—"}</p></div><span className="whitespace-nowrap text-xs text-slate-500">{dateFormat.format(new Date(movement.date))} · {movement.quantity} un</span></li>)}</ul> : <p className="p-6 text-sm text-slate-500">Nenhuma movimentação nesse período.</p>}</article></section>
    </>}
  </div>;
}

interface KpiProps {
  icon?: ReactNode;
  label: string;
  value: string;
  sub: string;
}

function Kpi({ icon, label, value, sub }: KpiProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
        {label}
        <span className="h-4 w-4 text-blue-600">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </article>
  );
}
