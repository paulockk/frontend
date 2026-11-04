import { useMemo, useState, type ChangeEvent } from "react";
import { FileSpreadsheet, LoaderCircle, X } from "lucide-react";
import { operationsService } from "../../services/operations.service";
import { parseVmPayPlanogramFile, type VmPayPlanogramPreview } from "../../services/vmpay-import.service";
import type { CatalogProduct, StoreLocation } from "../../types/operations";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

export function VmPayPlanogramImportDialog({
  products,
  locations,
  onClose,
  onComplete,
}: {
  products: CatalogProduct[];
  locations: StoreLocation[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const machines = locations.filter((location) => location.type === "VENDING_MACHINE" && location.status === "ACTIVE");
  const [preview, setPreview] = useState<VmPayPlanogramPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [machineLocationId, setMachineLocationId] = useState("");
  const [productMapping, setProductMapping] = useState<Record<number, string>>({});
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const mappedCount = useMemo(() => preview?.lines.filter((_, index) => Boolean(productMapping[index])).length ?? 0, [preview, productMapping]);
  const skippedCount = (preview?.lines.length ?? 0) - mappedCount;

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setPreview(null); setProductMapping({}); setProductSearch({}); setCompleted(false); setFileName(file.name);
    try {
      const result = await parseVmPayPlanogramFile(file);
      setPreview(result);
      const exactMachine = machines.find((location) => normalize(location.name).includes(normalize(result.machine)));
      setMachineLocationId(exactMachine?.id ?? "");
      setProductMapping(Object.fromEntries(result.lines.map((line, index) => {
        const match = products.find((product) => normalize(product.name) === normalize(line.productName));
        return match ? [String(index), match.id] as const : null;
      }).filter((entry): entry is readonly [string, string] => entry !== null)));
      if (!machines.length) setError("Cadastre a máquina como um local do tipo Máquina antes de importar o planograma.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível ler o planograma.");
    }
  };

  const importPlanogram = async () => {
    if (!preview || !machineLocationId || mappedCount === 0) return;
    setImporting(true); setProgress(0); setError("");
    const grouped = new Map<string, Array<{ locationId: string; batchNumber: string; quantity: string }>>();
    preview.lines.forEach((line, index) => {
      const productId = productMapping[index];
      if (!productId) return;
      const items = grouped.get(productId) ?? [];
      const safeMachine = preview.machine.replace(/[^a-zA-Z0-9_-]/g, "-");
      const isActive = normalize(line.status) === "ativo";
      items.push({ locationId: machineLocationId, batchNumber: `VMPAY:${safeMachine}-${line.channel}`, quantity: String(isActive ? line.quantity : 0) });
      grouped.set(productId, items);
    });
    try {
      let done = 0;
      for (const [productId, items] of grouped) {
        await operationsService.importVmPayStock(productId, items);
        done += 1; setProgress(done);
      }
      setCompleted(true);
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao atualizar o estoque da máquina.");
    } finally {
      setImporting(false);
    }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !importing) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="planogram-import-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 id="planogram-import-title" className="text-lg font-bold text-slate-900">Atualizar estoque da máquina</h2><p className="mt-1 text-sm text-slate-500">Importe o planograma atual do VMpay para sincronizar os saldos por canaleta.</p></div></div>
        <button type="button" onClick={onClose} disabled={importing} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
      </header>
      <div className="space-y-4 overflow-y-auto p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50/50"><FileSpreadsheet className="h-6 w-6 text-blue-600"/><span className="text-sm font-semibold text-slate-700">Selecionar planograma</span><span className="text-xs text-slate-500">CSV ou XLSX · exportação Planograma do VMpay</span><input type="file" accept=".csv,.xlsx" onChange={(event) => void readFile(event)} disabled={importing} className="sr-only" /></label>
        {fileName && <p className="text-xs text-slate-500">Arquivo: <b className="text-slate-700">{fileName}</b></p>}
        {preview && <>
          <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-3"><p className="text-sm text-slate-600"><b className="block text-xs uppercase text-slate-400">Máquina</b>{preview.machine}</p><p className="text-sm text-slate-600"><b className="block text-xs uppercase text-slate-400">Cliente</b>{preview.client || preview.local || "—"}</p><label className="text-xs font-semibold text-slate-600">Local da máquina<select value={machineLocationId} onChange={(event) => setMachineLocationId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Selecione a máquina no Stockflow</option>{machines.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label></div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span><b>{preview.lines.length}</b> canaletas</span><span><b>{mappedCount}</b> produtos vinculados</span><span><b>{skippedCount}</b> canaletas ignoradas</span><span><b>{preview.reportDate || "—"}</b> data do planograma</span></div>
      <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2.5">Canaleta</th><th className="px-3 py-2.5">Produto VMpay</th><th className="px-3 py-2.5">Vincular produto</th><th className="px-3 py-2.5 text-right">Qtd. atual</th><th className="px-3 py-2.5 text-right">Capacidade</th><th className="px-3 py-2.5">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.lines.map((line, index) => {
        const selectedProduct = products.find((product) => product.id === productMapping[index]);
        const optionLabel = (product: CatalogProduct) => `${product.name} · ${product.sku}`;
        const inputValue = productSearch[index] ?? (selectedProduct ? optionLabel(selectedProduct) : "");
        const listId = `planogram-products-${index}`;
        return <tr key={`${line.channel}-${index}`}><td className="px-3 py-2.5 font-mono">{line.channel}</td><td className="px-3 py-2.5">{line.productName}</td><td className="px-3 py-2.5"><input aria-label={`Pesquisar produto para canaleta ${line.channel}`} list={listId} value={inputValue} placeholder="Pesquisar produto (opcional)" onChange={(event) => {
          const value = event.target.value;
          setProductSearch((current) => ({ ...current, [index]: value }));
          const match = products.find((product) => product.status === "ACTIVE" && optionLabel(product) === value);
          setProductMapping((current) => {
            const next = { ...current };
            if (match) next[index] = match.id;
            else delete next[index];
            return next;
          });
        }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"/><datalist id={listId}>{products.filter((product) => product.status === "ACTIVE").map((product) => <option key={product.id} value={optionLabel(product)}/>)}</datalist></td><td className="px-3 py-2.5 text-right tabular-nums">{line.quantity}</td><td className="px-3 py-2.5 text-right tabular-nums">{line.capacity}</td><td className="px-3 py-2.5 text-xs text-slate-500">{line.status}</td></tr>;
      })}</tbody></table></div>
          <p className="text-xs leading-5 text-amber-700">Só as canaletas com produto vinculado serão importadas; as demais serão ignoradas e não terão o saldo alterado. O arquivo atualiza o saldo para a quantidade mostrada, sem somar o mesmo saldo numa nova importação. Lote e validade não vêm no planograma e precisam ser informados no Stockflow. Use o planograma como saldo inicial e importe apenas movimentações posteriores à data dele.</p>
        </>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {importing && <p className="flex items-center gap-2 text-sm text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin"/>Atualizando {progress} de {new Set(Object.values(productMapping)).size} produtos...</p>}
        {completed && <p role="status" className="text-sm text-emerald-700">Importação concluída: {mappedCount} canaletas vinculadas atualizadas; {skippedCount} ignoradas.</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" disabled={importing} onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">Fechar</button><button type="button" disabled={!preview || !machineLocationId || mappedCount === 0 || importing || machines.length === 0} onClick={() => void importPlanogram()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{importing && <LoaderCircle className="h-4 w-4 animate-spin"/>}{importing ? "Importando..." : "Atualizar estoque da máquina"}</button></footer>
    </section>
  </div>;
}
