import { useState, type ChangeEvent } from "react";
import { FileSpreadsheet, LoaderCircle, Upload, X } from "lucide-react";
import { operationsService } from "../../services/operations.service";
import { findExistingProduct, parseVmPayProductFile, type VmPayProductCandidate } from "../../services/vmpay-import.service";
import type { CatalogProduct, StoreLocation } from "../../types/operations";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function VmPayImportDialog({
  products,
  locations,
  onClose,
  onImported,
}: {
  products: CatalogProduct[];
  locations: StoreLocation[];
  onClose: () => void;
  onImported: (products: CatalogProduct[]) => void;
}) {
  const [candidates, setCandidates] = useState<VmPayProductCandidate[]>([]);
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [locationMapping, setLocationMapping] = useState<Record<string, string>>({});
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
  const sourceLocations = [...new Set(candidates.flatMap((candidate) => candidate.sourceLocations))];
  const mappedIds = (candidate: VmPayProductCandidate) => [...new Set(candidate.sourceLocations.map((name) => locationMapping[name]).filter(Boolean))];
  const isMapped = (candidate: VmPayProductCandidate) => candidate.sourceLocations.length === 0 || candidate.sourceLocations.every((name) => Boolean(locationMapping[name]));

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setCandidates([]); setFailures({}); setFileName(file.name);
    if (file.size > 15 * 1024 * 1024) {
      setError("O arquivo excede o limite de 15 MB.");
      return;
    }
    try {
      const preview = await parseVmPayProductFile(file);
      setCandidates(preview.candidates);
      setTotalRows(preview.totalRows);
      const mapping: Record<string, string> = {};
      for (const name of [...new Set(preview.candidates.flatMap((candidate) => candidate.sourceLocations))]) {
        const match = locations.find((location) => location.status === "ACTIVE" && normalize(location.name) === normalize(name));
        if (match) mapping[name] = match.id;
      }
      setLocationMapping(mapping);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível ler o arquivo.");
    }
  };

  const available = candidates.filter((candidate) => !candidate.issue && isMapped(candidate));
  const skipped = candidates.length - available.length;

  const importProducts = async () => {
    setImporting(true); setProgress(0); setFailures({});
    const imported: CatalogProduct[] = [];
    const knownProducts = [...products];
    const seen = new Set<string>();
    let completed = 0;
    for (const candidate of candidates) {
      const key = candidate.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
      if (candidate.issue || !isMapped(candidate) || seen.has(key)) {
        completed += 1; setProgress(completed); continue;
      }
      const existing = findExistingProduct(candidate, knownProducts);
      const targetLocations = mappedIds(candidate);
      if (existing) {
        try {
          const allLocations = [...new Set([...(existing.linkedLocationIds ?? []), ...targetLocations])];
          await operationsService.assignProductLocations(existing.id, allLocations);
          imported.push({ ...existing, linkedLocationIds: allLocations });
        } catch (cause) {
          setFailures((current) => ({ ...current, [candidate.sku]: cause instanceof Error ? cause.message : "Falha ao associar locais." }));
        }
        completed += 1; setProgress(completed); continue;
      }
      seen.add(key);
      const product: CatalogProduct = {
        id: "pending",
        sku: candidate.sku,
        barcode: "",
        name: candidate.name,
        category: "Outros",
        brand: "",
        supplier: "",
        unit: "UN",
        tracksExpiration: false,
        costPrice: candidate.costPrice,
        salePrice: candidate.salePrice,
        minimumStock: 0,
        shelfLifeDays: 0,
        locationsCount: 0,
        status: "ACTIVE",
      };
      try {
        const saved = await operationsService.createImportedProduct(product, targetLocations);
        imported.push(saved); knownProducts.push(saved);
      } catch (cause) {
        setFailures((current) => ({ ...current, [candidate.sku]: cause instanceof Error ? cause.message : "Falha ao salvar." }));
      }
      completed += 1; setProgress(completed);
    }
    if (imported.length) onImported(imported);
    setImporting(false);
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !importing) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="vmpay-import-title" className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 id="vmpay-import-title" className="text-lg font-bold text-slate-900">Importar produtos do VMpay</h2><p className="mt-1 text-sm text-slate-500">Envie a exportação de itens para conferir os produtos antes de criar.</p></div></div>
        <button type="button" onClick={onClose} disabled={importing} aria-label="Fechar importação" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
      </header>
      <div className="space-y-4 overflow-y-auto p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50/50">
          <Upload className="h-6 w-6 text-blue-600" /><span className="text-sm font-semibold text-slate-700">Selecionar arquivo do VMpay</span><span className="text-xs text-slate-500">XLSX, arquivo XLSX com extensão XLS ou CSV · até 15 MB</span>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => void readFile(event)} disabled={importing} className="sr-only" />
        </label>
        {fileName && <p className="text-xs text-slate-500">Arquivo: <span className="font-semibold text-slate-700">{fileName}</span></p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {candidates.length > 0 && <>
          {sourceLocations.length > 0 && <div className="space-y-2 rounded-xl border border-slate-200 p-3"><p className="text-sm font-semibold text-slate-800">Vincular locais do VMpay</p><p className="text-xs text-slate-500">Associe cada local do arquivo a um local cadastrado no Stockflow. Isso não altera o saldo.</p>{sourceLocations.map((name) => <label key={name} className="grid gap-2 text-xs font-medium text-slate-600 sm:grid-cols-[1fr_1fr] sm:items-center"><span>{name}</span><select value={locationMapping[name] ?? ""} onChange={(event) => setLocationMapping((current) => ({ ...current, [name]: event.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="">Selecione o local</option>{locations.filter((location) => location.status === "ACTIVE").map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>)}</div>}
          <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span><b>{totalRows}</b> linhas lidas</span><span><b>{candidates.length}</b> produtos distintos</span><span><b>{available.length}</b> prontos para importar</span><span><b>{skipped}</b> ignorados ou precisam revisão</span></div>
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2.5">Produto e SKU gerado</th><th className="px-3 py-2.5 text-right">Custo</th><th className="px-3 py-2.5 text-right">Preço desejado</th><th className="px-3 py-2.5 text-right">Linhas</th><th className="px-3 py-2.5">Situação</th></tr></thead><tbody className="divide-y divide-slate-100">{candidates.map((candidate) => {
            const existing = findExistingProduct(candidate, products);
            const failure = failures[candidate.sku];
            const status = failure ? failure : candidate.issue ? candidate.issue : !isMapped(candidate) ? "Vincule os locais acima" : existing ? `Associar locais a ${existing.sku}` : "Pronto";
            return <tr key={candidate.sku}><td className="px-3 py-2.5"><p className="font-medium text-slate-800">{candidate.name}</p><p className="font-mono text-[11px] text-slate-400">{candidate.sku}</p></td><td className="px-3 py-2.5 text-right tabular-nums">{money.format(candidate.costPrice)}</td><td className="px-3 py-2.5 text-right tabular-nums">{money.format(candidate.salePrice)}</td><td className="px-3 py-2.5 text-right">{candidate.sourceRows}</td><td className={`max-w-xs px-3 py-2.5 text-xs ${failure || candidate.issue ? "text-amber-700" : "text-slate-500"}`}>{status}</td></tr>;
          })}</tbody></table></div>
          <p className="text-xs leading-5 text-slate-500">Este arquivo não traz EAN, fornecedor, categoria, lotes ou saldo atual. Os produtos serão criados sem código de barras, na categoria “Outros” e com estoque zero. O SKU mostrado é gerado pelo Stockflow.</p>
        </>}
        {importing && <div className="flex items-center gap-2 text-sm text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin" />Importando {progress} de {candidates.length} registros...</div>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4"><p role="status" className="text-sm text-emerald-700">{Object.keys(failures).length ? `${Object.keys(failures).length} produto(s) falharam; confira a situação na tabela.` : ""}</p><div className="flex gap-2"><button type="button" disabled={importing} onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">Fechar</button><button type="button" disabled={!available.length || importing} onClick={() => void importProducts()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{importing && <LoaderCircle className="h-4 w-4 animate-spin" />}{importing ? "Importando..." : `Importar/vincular ${available.length} produto(s)`}</button></div></footer>
    </section>
  </div>;
}
