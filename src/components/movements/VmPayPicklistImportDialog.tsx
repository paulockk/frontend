import { useMemo, useState, type ChangeEvent } from "react";
import { FileSpreadsheet, LoaderCircle, X } from "lucide-react";
import { operationsService } from "../../services/operations.service";
import { parseVmPayPicklistFile, type VmPayPicklistLine } from "../../services/vmpay-picklist-import.service";
import type { CatalogProduct, MovementRecord, ProductStockLot, StoreLocation } from "../../types/operations";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
const machineKey = (line: VmPayPicklistLine) => `${normalize(line.local)}|${normalize(line.machine)}`;

export function VmPayPicklistImportDialog({
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
  const warehouses = locations.filter((location) => location.type === "WAREHOUSE" && location.status === "ACTIVE");
  const machines = locations.filter((location) => location.type === "VENDING_MACHINE" && location.status === "ACTIVE");
  const [lines, setLines] = useState<VmPayPicklistLine[]>([]);
  const [reportState, setReportState] = useState("");
  const [fileName, setFileName] = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [machineMapping, setMachineMapping] = useState<Record<string, string>>({});
  const [productMapping, setProductMapping] = useState<Record<number, string>>({});
  const [stockLots, setStockLots] = useState<ProductStockLot[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Record<string, string>>({});

  const machineKeys = useMemo(() => [...new Set(lines.map(machineKey))], [lines]);
  const readyCount = lines.filter((line, index) => productMapping[index] && machineMapping[machineKey(line)]).length;
  const unmappedMachines = machineKeys.filter((key) => !machineMapping[key]).length;
  const productMatchCount = lines.filter((_, index) => Boolean(productMapping[index])).length;

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setLines([]); setReportState(""); setResults({}); setFileName(file.name);
    try {
      const [preview, lots, movementHistory] = await Promise.all([
        parseVmPayPicklistFile(file), operationsService.listStockLots(), operationsService.listMovements(),
      ]);
      setLines(preview.lines); setReportState(preview.state); setStockLots(lots); setMovements(movementHistory);
      setProductMapping(Object.fromEntries(preview.lines.map((line, index) => {
        const match = products.find((product) => normalize(product.name) === normalize(line.productName));
        return match ? [String(index), match.id] as const : null;
      }).filter((entry): entry is readonly [string, string] => entry !== null)));
      const mapping: Record<string, string> = {};
      for (const line of preview.lines) {
        const key = machineKey(line);
        const exact = machines.find((location) => normalize(location.name).includes(normalize(line.machine)));
        if (exact) mapping[key] = exact.id;
      }
      setMachineMapping(mapping);
      setSourceLocationId(warehouses.length === 1 ? warehouses[0]!.id : "");
      if (preview.state && normalize(preview.state) !== "aplicada") setError("Este relatório não está marcado como aplicado; só é possível importar picklists já aplicados.");
      else if (!warehouses.length) setError("Cadastre um local do tipo Estoque central antes de importar picklists.");
      else if (!machines.length) setError("Cadastre cada equipamento como um local do tipo Máquina antes de importar picklists.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o relatório de picklists.");
    }
  };

  const importPicklists = async () => {
    if (!sourceLocationId || readyCount !== lines.length || (reportState && normalize(reportState) !== "aplicada")) return;
    setImporting(true); setProgress(0); setResults({}); setError("");
    const available = new Map(stockLots.map((lot) => [lot.batchId, lot.quantity]));
    const resultMessages: Record<string, string> = {};
    let done = 0;
    const updatedMovements = [...movements];
    try {
    for (const [lineIndex, line] of lines.entries()) {
      const product = products.find((item) => item.id === productMapping[lineIndex]);
      const destinationId = machineMapping[machineKey(line)];
      const destination = machines.find((item) => item.id === destinationId);
      if (!product || !destination) { resultMessages[line.noteKey] = "Vincule o produto e a máquina."; done += 1; setProgress(done); continue; }

      const alreadyTransferred = movements
        .filter((movement) => movement.type === "TRANSFER" && movement.note === line.noteKey)
        .reduce((total, movement) => total + movement.quantity, 0);
      const remaining = Math.max(0, line.quantity - alreadyTransferred);
      if (remaining === 0) { resultMessages[line.noteKey] = "Este item do picklist já foi transferido."; done += 1; setProgress(done); continue; }

      const lots = stockLots.filter((lot) => lot.productId === product.id && lot.locationId === sourceLocationId && (available.get(lot.batchId) ?? 0) > 0)
        .sort((left, right) => (left.expiryDate ?? "9999-12-31").localeCompare(right.expiryDate ?? "9999-12-31") || (left.batchNumber ?? "").localeCompare(right.batchNumber ?? ""));
      const totalAvailable = lots.reduce((total, lot) => total + (available.get(lot.batchId) ?? 0), 0);
      if (totalAvailable < remaining) {
        resultMessages[line.noteKey] = `Estoque central insuficiente: faltam ${remaining - totalAvailable} unidade(s).`;
        done += 1; setProgress(done); setResults({ ...resultMessages }); continue;
      }

      let needed = remaining;
      try {
        for (const lot of lots) {
          if (needed <= 0) break;
          const availableQuantity = available.get(lot.batchId) ?? 0;
          const quantity = Math.min(availableQuantity, needed);
          const record = await operationsService.createMovement({
            type: "TRANSFER", productName: product.name, sku: product.sku, quantity,
            unit: product.unit ?? "UN", origin: lot.location, destination: destination.name,
            batch: lot.batchNumber ?? "—", expiryDate: lot.expiryDate, note: line.noteKey,
          });
          available.set(lot.batchId, availableQuantity - quantity);
          updatedMovements.push(record);
          needed -= quantity;
        }
        resultMessages[line.noteKey] = alreadyTransferred ? `Transferência completada; ${alreadyTransferred} já constavam.` : `Transferida para ${destination.name}.`;
      } catch (cause) {
        resultMessages[line.noteKey] = cause instanceof Error ? cause.message : "Falha ao transferir este item.";
      }
      done += 1; setProgress(done); setResults({ ...resultMessages });
    }
    setMovements(updatedMovements);
    await onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A importação foi interrompida.");
    } finally {
      setImporting(false);
    }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !importing) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="picklist-import-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div className="flex gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><FileSpreadsheet className="h-5 w-5"/></span><div><h2 id="picklist-import-title" className="text-lg font-bold text-slate-900">Importar picklists aplicados</h2><p className="mt-1 text-sm text-slate-500">Transfere o saldo do estoque central para cada máquina, preservando lote e validade.</p></div></div><button type="button" onClick={onClose} disabled={importing} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5"/></button></header>
      <div className="space-y-4 overflow-y-auto p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50/50"><FileSpreadsheet className="h-6 w-6 text-blue-600"/><span className="text-sm font-semibold text-slate-700">Selecionar relatório de picklists aplicados</span><span className="text-xs text-slate-500">CSV ou XLSX · exportação Pick lists items do VMpay</span><input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => void loadFile(event)} disabled={importing} className="sr-only"/></label>
        {fileName && <p className="text-xs text-slate-500">Arquivo: <b className="text-slate-700">{fileName}</b></p>}
        {lines.length > 0 && <>
          <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Estoque central de origem<select value={sourceLocationId} onChange={(event) => setSourceLocationId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Selecione o estoque central</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label><div className="space-y-1 text-xs text-slate-500"><b className="text-slate-700">Vincule as máquinas</b>{machineKeys.map((key) => { const line = lines.find((item) => machineKey(item) === key)!; return <label key={key} className="grid grid-cols-[1fr_1fr] items-center gap-2"><span className="truncate">{line.local} · Máquina {line.machine}</span><select value={machineMapping[key] ?? ""} onChange={(event) => setMachineMapping((current) => ({ ...current, [key]: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="">Selecione</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}</select></label>; })}</div></div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span><b>{lines.length}</b> itens no arquivo</span><span><b>{productMatchCount}</b> produtos vinculados</span><span><b>{unmappedMachines}</b> máquinas pendentes</span></div>
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2.5">Picklist / data</th><th className="px-3 py-2.5">Máquina / canaleta</th><th className="px-3 py-2.5">Produto VMpay</th><th className="px-3 py-2.5">Produto no Stockflow</th><th className="px-3 py-2.5 text-right">Qtd.</th><th className="px-3 py-2.5">Situação</th></tr></thead><tbody className="divide-y divide-slate-100">{lines.map((line, index) => <tr key={line.noteKey}><td className="px-3 py-2.5"><p>{line.picklistId}</p><p className="text-xs text-slate-400">{line.applicationDate}</p></td><td className="px-3 py-2.5">{line.machine} · {line.channel}</td><td className="px-3 py-2.5">{line.productName}</td><td className="px-3 py-2.5"><select value={productMapping[index] ?? ""} onChange={(event) => setProductMapping((current) => ({ ...current, [index]: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="">Selecione produto</option>{products.filter((product) => product.status === "ACTIVE").map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></td><td className="px-3 py-2.5 text-right tabular-nums">{line.quantity}</td><td className="max-w-xs px-3 py-2.5 text-xs text-slate-500">{results[line.noteKey] ?? "Pronto para transferir"}</td></tr>)}</tbody></table></div>
          <p className="text-xs leading-5 text-amber-700">Use o planograma como saldo inicial; este relatório tem picklists aplicados dos últimos dias e não deve ser importado em cima de um saldo atual que já os inclui. O sistema transfere primeiro os lotes com validade mais próxima e ignora itens já registrados pelo identificador do picklist.</p>
        </>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {importing && <p className="flex items-center gap-2 text-sm text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin"/>Processando {progress} de {lines.length} itens...</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" disabled={importing} onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">Fechar</button><button type="button" disabled={!lines.length || !sourceLocationId || readyCount !== lines.length || importing || !warehouses.length || !machines.length || Boolean(reportState && normalize(reportState) !== "aplicada")} onClick={() => void importPicklists()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{importing && <LoaderCircle className="h-4 w-4 animate-spin"/>}{importing ? "Transferindo..." : "Transferir picklists"}</button></footer>
    </section>
  </div>;
}
