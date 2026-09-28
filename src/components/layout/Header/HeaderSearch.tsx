import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpDown, MapPin, Package, Search } from "lucide-react";
import { expiryService } from "../../../services/expiry.service";
import { operationsService } from "../../../services/operations.service";
import type { ExpiryLot } from "../../../types/expiry";
import type { MovementRecord, StoreLocation, CatalogProduct } from "../../../types/operations";

interface SearchResult { title: string; detail: string; path: string; kind: "Produto" | "Lote" | "Movimentação" | "Local"; }
interface HeaderSearchProps { onSearch?: (query: string) => void; }

export const HeaderSearch = ({ onSearch }: HeaderSearchProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [lots, setLots] = useState<ExpiryLot[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void Promise.all([
      operationsService.listProducts(),
      operationsService.listMovements(),
      operationsService.listLocations(),
      expiryService.list({ search: "", location: "ALL", category: "ALL", severity: "ALL", page: 1, pageSize: 50 }),
    ]).then(([productItems, movementItems, locationItems, expiryData]) => {
      if (!active) return;
      setProducts(productItems); setMovements(movementItems); setLocations(locationItems); setLots(expiryData.items);
    }).catch(() => { /* Search remains available for page navigation if data loading fails. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen(true); inputRef.current?.focus();
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return [];
    const found: SearchResult[] = [];
    products.forEach((product) => {
      if (`${product.name} ${product.sku} ${product.barcode} ${product.brand}`.toLocaleLowerCase("pt-BR").includes(term)) found.push({ title: product.name, detail: `${product.sku} · ${product.barcode}`, kind: "Produto", path: `/produtos?search=${encodeURIComponent(query.trim())}` });
    });
    lots.forEach((lot) => {
      if (`${lot.productName} ${lot.sku} ${lot.barcode} ${lot.batchNumber} ${lot.location}`.toLocaleLowerCase("pt-BR").includes(term)) found.push({ title: lot.productName, detail: `Lote ${lot.batchNumber} · ${lot.location}`, kind: "Lote", path: `/validades?search=${encodeURIComponent(query.trim())}` });
    });
    movements.forEach((movement) => {
      if (`${movement.productName} ${movement.sku} ${movement.batch} ${movement.origin ?? ""} ${movement.destination ?? ""}`.toLocaleLowerCase("pt-BR").includes(term)) found.push({ title: movement.productName, detail: `${movement.sku} · Lote ${movement.batch}`, kind: "Movimentação", path: `/movimentacoes?search=${encodeURIComponent(query.trim())}` });
    });
    locations.forEach((location) => {
      if (`${location.name} ${location.address}`.toLocaleLowerCase("pt-BR").includes(term)) found.push({ title: location.name, detail: location.address, kind: "Local", path: "/locais" });
    });
    return found.slice(0, 8);
  }, [query, products, movements, locations, lots]);

  const choose = (path: string) => { setOpen(false); navigate(path); };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && results[0]) { event.preventDefault(); choose(results[0].path); }
  };

  return <div className="relative w-full max-w-md">
    <Search className="pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-slate-400" />
    <input ref={inputRef} type="search" value={query} onFocus={() => setOpen(true)} onChange={(event) => { const value = event.target.value; setQuery(value); setOpen(true); onSearch?.(value); }} onKeyDown={handleKeyDown} placeholder="Buscar produtos, lotes ou movimentações..." aria-label="Buscar no sistema" aria-expanded={open} aria-controls="header-search-results" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-16 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
    <kbd className="pointer-events-none absolute inset-y-0 right-2.5 my-auto flex h-5 items-center rounded border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-400 shadow-xs">Ctrl + K</kbd>
    {open && <div id="header-search-results" role="listbox" aria-label="Resultados da busca" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      {query.trim() ? results.length ? <><p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Resultados · Enter abre o primeiro</p>{results.map((result, index) => <button key={`${result.kind}-${result.path}-${result.title}-${index}`} type="button" role="option" onClick={() => choose(result.path)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-blue-50"><span className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-500">{result.kind === "Produto" ? <Package className="h-4 w-4"/> : result.kind === "Local" ? <MapPin className="h-4 w-4"/> : <ArrowUpDown className="h-4 w-4"/>}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{result.title}</span><span className="block truncate text-xs text-slate-500">{result.kind} · {result.detail}</span></span><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300"/></button>)}</> : <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhum resultado encontrado.</p> : <div className="p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Acesso rápido</p>{[["Produtos", "/produtos"], ["Estoque", "/estoque"], ["Validades", "/validades"], ["Movimentações", "/movimentacoes"]].map(([label, path]) => <button key={path} type="button" onClick={() => choose(path)} className="block w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-700 hover:bg-blue-50">{label}</button>)}</div>}
      <button type="button" onClick={() => setOpen(false)} className="w-full border-t border-slate-100 px-3 py-2 text-left text-xs text-slate-400 hover:bg-slate-50">Fechar · Esc</button>
    </div>}
  </div>;
};

export default HeaderSearch;
