import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { FileSpreadsheet, LoaderCircle, X } from "lucide-react";
import { operationsService } from "../../services/operations.service";
import { parseVmPaySalesFile, type VmPaySaleRow } from "../../services/vmpay-sales-import.service";
import type { CatalogProduct, StoreLocation } from "../../types/operations";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
const moneyValue = (value: number) => value.toFixed(2);

function productMatches(row: VmPaySaleRow, products: CatalogProduct[]): { product?: CatalogProduct; conflict?: string } {
  const code = row.productCode.trim().toLocaleUpperCase();
  const byCode = products.find((item) => item.externalSystem?.toLocaleUpperCase() === "VMPAY" && item.externalCode?.toLocaleUpperCase() === code)
    ?? products.find((item) => item.sku.toLocaleUpperCase() === code || item.barcode.toLocaleUpperCase() === code);
  const byName = products.find((item) => normalize(item.name) === normalize(row.productName));
  if (byCode && byName && byCode.id !== byName.id) return { conflict: "Código e nome apontam para produtos diferentes." };
  const product = byCode ?? byName;
  if (product?.externalCode && (product.externalSystem?.toLocaleUpperCase() !== "VMPAY" || product.externalCode.toLocaleUpperCase() !== code)) {
    return { conflict: `Produto já associado ao código externo ${product.externalCode}.` };
  }
  return { product };
}

export function VmPaySalesImportDialog({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [rows, setRows] = useState<VmPaySaleRow[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [locationMapping, setLocationMapping] = useState<Record<string, string>>({});
  const [valueMode, setValueMode] = useState<"TOTAL" | "UNIT">("TOTAL");
  const [applyStock, setApplyStock] = useState(true);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Record<string, string>>({});
  const [completedCount, setCompletedCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);

  const locationsForMapping = useMemo(() => [...new Map(rows.filter((row) => row.locationLabel).map((row) => [row.locationKey, row.locationLabel])).entries()], [rows]);

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setRows([]); setResults({}); setFileName(file.name); setLoadingFile(true);
    try {
      const [parsedRows, productItems, locationItems] = await Promise.all([
        parseVmPaySalesFile(file), operationsService.listProducts(), operationsService.listLocations(),
      ]);
      setRows(parsedRows); setProducts(productItems); setLocations(locationItems.filter((location) => location.status === "ACTIVE"));
      const mapping: Record<string, string> = {};
      for (const row of parsedRows) {
        const exact = locationItems.find((location) => location.status === "ACTIVE" && normalize(location.name) === normalize(row.locationLabel));
        if (exact) mapping[row.locationKey] = exact.id;
      }
      setLocationMapping(mapping);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o relatório.");
    } finally { setLoadingFile(false); }
  };

  const unitPrice = (row: VmPaySaleRow) => valueMode === "UNIT"
    ? row.value
    : Math.round((row.value / row.quantity) * 100) / 100;

  const stockShortages = useMemo(() => {
    if (!applyStock) return [];
    const required = new Map<string, { label: string; locationId: string; quantity: number; available: number }>();
    for (const row of rows) {
      if (row.issue) continue;
      const locationId = locationMapping[row.locationKey];
      const match = productMatches(row, products);
      if (!locationId || match.conflict) continue;
      const productId = match.product?.id ?? `new:${row.productCode}`;
      const key = `${productId}:${locationId}`;
      const current = required.get(key) ?? { label: match.product?.name ?? `${row.productName} (novo)`, locationId, quantity: 0, available: match.product?.stockByLocation?.[locationId] ?? 0 };
      current.quantity += row.quantity;
      required.set(key, current);
    }
    return [...required.values()].filter(({ quantity, available }) => quantity > available);
  }, [rows, locationMapping, products, applyStock]);

  const readyRows = rows.filter((row) => !row.issue && Boolean(locationMapping[row.locationKey]) && !productMatches(row, products).conflict);
  const unmappedLocations = locationsForMapping.filter(([key]) => !locationMapping[key]).length;
  const conflictCount = rows.filter((row) => !row.issue && Boolean(productMatches(row, products).conflict)).length;
  const skippedCount = rows.length - readyRows.length;
  const blockedByStock = applyStock && stockShortages.length > 0;

  const importSales = async () => {
    setImporting(true); setProgress(0); setResults({}); setCompletedCount(0); setDuplicateCount(0);
    let completed = 0;
    let duplicates = 0;
    const knownProducts = [...products];
    const resultMessages: Record<string, string> = {};
    for (const row of rows) {
      if (row.issue || !locationMapping[row.locationKey]) { completed += 1; setProgress(completed); continue; }
      let match = productMatches(row, knownProducts);
      if (match.conflict) { resultMessages[row.externalId] = match.conflict; completed += 1; setProgress(completed); continue; }
      let product = match.product;
      const price = unitPrice(row);
      try {
        if (!product) {
          const codeSlug = row.productCode.toLocaleUpperCase().replace(/[^A-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || row.externalId.slice(0, 12);
          product = await operationsService.createImportedProduct({
            id: "pending", sku: `VMP-${codeSlug}`.slice(0, 64), barcode: "", name: row.productName,
            category: "Sem categoria", brand: "", supplier: "", externalSystem: "VMPAY", externalCode: row.productCode,
            unit: "UN", tracksExpiration: false, costPrice: 0, salePrice: price, minimumStock: 0,
            shelfLifeDays: 0, locationsCount: 0, status: "ACTIVE",
          });
          knownProducts.push(product);
        } else if (!product.externalCode) {
          product = await operationsService.linkExternalProductCode(product, "VMPAY", row.productCode);
          knownProducts[knownProducts.findIndex((item) => item.id === product!.id)] = product;
        }
        const sale = await operationsService.importSale({
          externalSystem: "VMPAY", externalId: row.externalId, receipt: row.receipt,
          locationId: locationMapping[row.locationKey]!, occurredAt: row.occurredAt,
          paymentMethod: "VMpay (não informado)", applyStock,
          items: [{
            productCode: row.productCode,
            quantity: String(row.quantity),
            unitPrice: moneyValue(price),
            ...(valueMode === "TOTAL" ? { lineTotal: moneyValue(row.value) } : {}),
          }],
        });
        if (sale.duplicate) duplicates += 1;

        resultMessages[row.externalId] = sale.duplicate ? "Já importada anteriormente." : "Importada.";
      } catch (cause) {
        resultMessages[row.externalId] = cause instanceof Error ? cause.message : "Falha ao registrar a venda.";
      }
      completed += 1; setProgress(completed); setResults({ ...resultMessages }); setDuplicateCount(duplicates);
    }
    const successful = Object.values(resultMessages).filter((message) => message === "Importada.").length;
    setCompletedCount(successful); setDuplicateCount(duplicates); setResults(resultMessages);
    if (successful || duplicates) await onComplete();
    setImporting(false);
  };

  useEffect(() => { if (importing) setProgress(0); }, [importing]);

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !importing) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="vmpay-sales-import-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div className="flex gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 id="vmpay-sales-import-title" className="text-lg font-bold text-slate-900">Importar vendas do VMpay</h2><p className="mt-1 text-sm text-slate-500">Cada linha do relatório é conferida e importada uma única vez.</p></div></div><button type="button" onClick={onClose} disabled={importing} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button></header>
      <div className="space-y-4 overflow-y-auto p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50/50"><FileSpreadsheet className="h-6 w-6 text-blue-600"/><span className="text-sm font-semibold text-slate-700">Selecionar relatório de vendas</span><span className="text-xs text-slate-500">CSV ou XLSX · exportação do VMpay</span><input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => void loadFile(event)} disabled={loadingFile || importing} className="sr-only" /></label>
        {fileName && <p className="text-xs text-slate-500">Arquivo: <b className="text-slate-700">{fileName}</b></p>}
        {loadingFile && <p className="flex items-center gap-2 text-sm text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin"/>Lendo relatório e catálogo...</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {rows.length > 0 && <>
          <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">O campo “Valor” representa<select value={valueMode} onChange={(event) => setValueMode(event.target.value as "TOTAL" | "UNIT")} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="TOTAL">o total da linha (divide pela quantidade para achar o unitário)</option><option value="UNIT">o preço por unidade</option></select></label>
            <label className="flex items-start gap-2 pt-1 text-sm text-slate-700"><input type="checkbox" checked={applyStock} onChange={(event) => setApplyStock(event.target.checked)} className="mt-0.5 accent-blue-600"/><span><b>Baixar do estoque ao importar</b><small className="mt-1 block text-xs text-slate-500">Use quando o saldo inicial do Stockflow já foi carregado.</small></span></label>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-bold text-slate-800">Vincule os locais do VMpay</h3>{locationsForMapping.map(([key, label]) => <label key={key} className="grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-[1fr_1fr] sm:items-center"><span>{label}</span><select value={locationMapping[key] ?? ""} onChange={(event) => setLocationMapping((current) => ({ ...current, [key]: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Selecione um local no Stockflow</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>)}</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span><b>{rows.length}</b> linhas no arquivo</span><span><b>{readyRows.length}</b> prontas</span><span><b>{skippedCount}</b> com problema, vínculo pendente ou código conflitante</span>{blockedByStock && <span className="font-semibold text-amber-700">Saldo insuficiente em {stockShortages.length} produto(s)/local(is).</span>}</div>
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2.5">Data / local</th><th className="px-3 py-2.5">Produto / código VMpay</th><th className="px-3 py-2.5 text-right">Qtd.</th><th className="px-3 py-2.5 text-right">Valor linha</th><th className="px-3 py-2.5">Situação</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => {
            const match = productMatches(row, products);
            const status = results[row.externalId] ?? row.issue ?? match.conflict ?? (locationMapping[row.locationKey] ? match.product ? "Produto vinculado" : "Produto será criado" : "Vincule o local");
            return <tr key={row.externalId}><td className="px-3 py-2.5"><p>{row.dateLabel}</p><p className="text-xs text-slate-400">{row.locationLabel}</p></td><td className="px-3 py-2.5"><p className="font-medium text-slate-800">{row.productName}</p><p className="font-mono text-[11px] text-slate-400">{row.productCode}</p></td><td className="px-3 py-2.5 text-right tabular-nums">{row.quantity}</td><td className="px-3 py-2.5 text-right tabular-nums">{money.format(row.value)}</td><td className={`max-w-xs px-3 py-2.5 text-xs ${row.issue || match.conflict || results[row.externalId]?.includes("não") ? "text-amber-700" : "text-slate-500"}`}>{status}</td></tr>;
          })}</tbody></table></div>
          <p className="text-xs leading-5 text-slate-500">O relatório não informa comprovante único nem pagamento. O Stockflow gera uma referência estável por linha e registra pagamento como “VMpay (não informado)”. Produtos novos entram sem custo de compra e sem saldo. Relatórios com alteração nos mesmos dados podem exigir revisão manual.</p>
        </>}
        {importing && <p className="flex items-center gap-2 text-sm text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin"/>Processando {progress} de {rows.length} linhas...</p>}
        {!importing && completedCount > 0 && <p role="status" className="text-sm text-emerald-700">{completedCount} venda(s) importada(s); {duplicateCount} duplicata(s) ignorada(s).</p>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4"><p className="text-sm text-amber-700">{unmappedLocations ? `${unmappedLocations} local(is) precisam ser vinculados.` : conflictCount ? `${conflictCount} código(s) precisam revisão.` : blockedByStock ? "Escolha se deseja registrar o histórico sem mexer no saldo." : ""}</p><div className="flex gap-2"><button type="button" disabled={importing} onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">Fechar</button><button type="button" disabled={!readyRows.length || unmappedLocations > 0 || conflictCount > 0 || blockedByStock || importing || loadingFile} onClick={() => void importSales()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{importing && <LoaderCircle className="h-4 w-4 animate-spin"/>}{importing ? "Importando..." : `Importar ${readyRows.length} venda(s)`}</button></div></footer>
    </section>
  </div>;
}





