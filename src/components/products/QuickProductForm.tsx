import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Barcode,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  PackagePlus,
  Save,
  X,
} from "lucide-react";
import type { CatalogProduct, StoreLocation } from "../../types/operations";
import { operationsService } from "../../services/operations.service";

export interface QuickProductFormData {
  barcode: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  costPrice: string;
  salePrice: string;
  minStockGlobal: string;
  expiryDate: string;
  initialStockByLocation: Record<string, string>;
  unit: string;
  isPerishable: boolean;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 180);
  return toDateInputValue(date);
}

function createInitialForm(): QuickProductFormData {
  return {
    barcode: "",
    sku: "",
    name: "",
    brand: "",
    category: "Bebidas",
    costPrice: "",
    salePrice: "",
    minStockGlobal: "30",
    expiryDate: defaultExpiryDate(),
    initialStockByLocation: {},
    unit: "un",
    isPerishable: false,
  };
}

export function QuickProductForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: QuickProductFormData) => Promise<void>;
}) {
  const [form, setForm] = useState(createInitialForm);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [awaitingScan, setAwaitingScan] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [barcodeChecking, setBarcodeChecking] = useState(false);
  const [existingBarcodeProduct, setExistingBarcodeProduct] = useState<CatalogProduct | null>(null);
  const barcodeInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void operationsService
      .listLocations()
      .then((items) =>
        setLocations(items.filter((location) => location.status === "ACTIVE")),
      )
      .catch(() => setError("Não foi possível carregar os locais ativos."));
  }, []);

  const update = (patch: Partial<QuickProductFormData>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const cost = Number(form.costPrice.replace(",", ".")) || 0;
  const sale = Number(form.salePrice.replace(",", ".")) || 0;
  const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;
  const profit = Math.max(0, sale - cost);

  const activateBarcodeReader = () => {
    setScanComplete(false);
    setExistingBarcodeProduct(null);
    setAwaitingScan(true);
    barcodeInput.current?.focus();
  };

  const checkScannedBarcode = async (value: string) => {
    const barcode = value.trim();
    if (!barcode) return;
    setAwaitingScan(false);
    setBarcodeChecking(true);
    setScanComplete(false);
    setExistingBarcodeProduct(null);
    setError(null);
    try {
      const existing = await operationsService.findProductByBarcode(barcode);
      setExistingBarcodeProduct(existing);
      setScanComplete(!existing);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Não foi possível verificar o código na API: ${cause.message}`
          : "Não foi possível verificar o código na API.",
      );
    } finally {
      setBarcodeChecking(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar o produto.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm"
      aria-labelledby="quick-product-title"
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-600 p-2.5 text-white">
            <PackagePlus className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="quick-product-title" className="font-bold text-slate-900">
                Cadastro rápido de produto
              </h2>
              <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                Entrada expressa
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Informe os dados do produto e distribua o estoque inicial entre os
              locais ativos.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar cadastro rápido"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <form onSubmit={(event) => void submit(event)} className="space-y-5 p-5">
        <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
              <Barcode className="h-4 w-4 text-blue-600" />
              Código de barras e SKU
            </h3>
            <button
              type="button"
              onClick={activateBarcodeReader}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Barcode className="h-3.5 w-3.5" />
              Usar leitor de código
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Código de barras (EAN / GTIN) *">
              <input
                ref={barcodeInput}
                required
                value={form.barcode}
                onChange={(event) => {
                  update({ barcode: event.target.value });
                  setScanComplete(false);
                  setExistingBarcodeProduct(null);
                }}
                onBlur={(event) => {
                  if (awaitingScan && event.currentTarget.value.trim()) {
                    void checkScannedBarcode(event.currentTarget.value);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void checkScannedBarcode(event.currentTarget.value);
                  }
                }}
                className={`${inputClass} font-mono`}
                placeholder="Ex.: 789123456789"
              />
            </Field>
            <Field label="Código SKU interno">
              <input
                value={form.sku}
                onChange={(event) => update({ sku: event.target.value })}
                className={`${inputClass} font-mono`}
                placeholder="Ex.: BEB-COC-350"
              />
            </Field>
          </div>
          {(awaitingScan || scanComplete || barcodeChecking || existingBarcodeProduct) && (
            <p
              aria-live="polite"
              className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${scanComplete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}
            >
              {existingBarcodeProduct ? (
                <Barcode className="h-4 w-4" />
              ) : scanComplete ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Barcode className="h-4 w-4" />
              )}
              {existingBarcodeProduct
                ? `Este código já está cadastrado em ${existingBarcodeProduct.name}.`
                : barcodeChecking
                ? "Verificando código na API..."
                : scanComplete
                ? "Código lido. Complete os dados restantes do produto."
                : "Leitor ativo: escaneie o código de barras."}
            </p>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome do produto *" className="sm:col-span-2">
            <input
              required
              value={form.name}
              onChange={(event) => update({ name: event.target.value })}
              className={inputClass}
              placeholder="Nome completo"
            />
          </Field>
          <Field label="Marca / fabricante">
            <input
              value={form.brand}
              onChange={(event) => update({ brand: event.target.value })}
              className={inputClass}
              placeholder="Marca"
            />
          </Field>
          <Field label="Categoria">
            <select
              value={form.category}
              onChange={(event) => update({ category: event.target.value })}
              className={inputClass}
            >
              <option>Bebidas</option>
              <option>Perecíveis</option>
              <option>Snacks e Doces</option>
              <option>Laticínios</option>
              <option>Outros</option>
            </select>
          </Field>
          <Field label="Unidade de medida">
            <select
              value={form.unit}
              onChange={(event) => update({ unit: event.target.value })}
              className={inputClass}
            >
              <option value="un">Unidade (un)</option>
              <option value="pct">Pacote (pct)</option>
              <option value="cx">Caixa (cx)</option>
              <option value="kg">Quilograma (kg)</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isPerishable}
              onChange={(event) =>
                update({ isPerishable: event.target.checked })
              }
              className="h-4 w-4 accent-blue-600"
            />
            Produto perecível
          </label>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Precificação e margem
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Preço de custo (R$)">
              <input
                inputMode="decimal"
                value={form.costPrice}
                onChange={(event) => update({ costPrice: event.target.value })}
                className={`${inputClass} font-mono`}
                placeholder="0,00"
              />
            </Field>
            <Field label="Preço de venda (R$) *">
              <input
                required
                inputMode="decimal"
                value={form.salePrice}
                onChange={(event) => update({ salePrice: event.target.value })}
                className={`${inputClass} font-mono`}
                placeholder="0,00"
              />
            </Field>
            <div>
              <span className="mb-1 block text-xs font-semibold text-slate-500">
                Margem estimada
              </span>
              <div className="flex h-9.5 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm">
                <b className="text-emerald-700">{margin.toFixed(1)}%</b>
                <span className="text-xs text-slate-400">
                  R$ {profit.toFixed(2).replace(".", ",")}/un
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Field
            label={
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Data de validade
              </span>
            }
          >
            <input
              required
              lang="pt-BR"
              type="date"
              value={form.expiryDate}
              onChange={(event) => {
                const selected = new Date(`${event.target.value}T00:00:00`);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const days = Math.ceil(
                  (selected.getTime() - today.getTime()) / 86400000,
                );
                update({
                  expiryDate: event.target.value,
                  isPerishable: days <= 30,
                });
              }}
              className={`${inputClass} font-mono`}
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">
              Selecione no calendário ou digite no formato dd/mm/aaaa.
            </span>
          </Field>
          <Field label="Estoque mínimo global">
            <input
              min="0"
              type="number"
              value={form.minStockGlobal}
              onChange={(event) =>
                update({ minStockGlobal: event.target.value })
              }
              className={`${inputClass} font-mono`}
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Estoque inicial por local
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Informe a quantidade em cada loja ou máquina ativa. Deixe zero
              onde não houver unidades.
            </p>
          </div>
          {locations.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {locations.map((location) => (
                <Field key={location.id} label={location.name}>
                  <input
                    min="0"
                    type="number"
                    value={form.initialStockByLocation[location.id] ?? "0"}
                    onChange={(event) =>
                      update({
                        initialStockByLocation: {
                          ...form.initialStockByLocation,
                          [location.id]: event.target.value,
                        },
                      })
                    }
                    className={`${inputClass} font-mono`}
                  />
                </Field>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-700">
              Nenhum local ativo encontrado.
            </p>
          )}
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || barcodeChecking || Boolean(existingBarcodeProduct) || locations.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando…" : "Salvar produto"}
          </button>
        </footer>
      </form>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`block text-xs font-semibold text-slate-500 ${className}`}
    >
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function quickFormToProduct(
  data: QuickProductFormData,
  id: string,
): CatalogProduct {
  const price = (value: string) => Number(value.replace(",", ".")) || 0;
  const expiryDate = new Date(`${data.expiryDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // A API ainda recebe o prazo em dias; a data escolhida também fica salva no produto.
  const shelfLifeDays = Math.max(
    0,
    Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000),
  );
  return {
    id,
    sku: data.sku || data.barcode,
    barcode: data.barcode,
    name: data.name,
    unit: data.unit.toUpperCase(),
    tracksExpiration: data.isPerishable,
    brand: data.brand,
    category: data.category,
    costPrice: price(data.costPrice),
    salePrice: price(data.salePrice),
    minimumStock: Number(data.minStockGlobal) || 0,
    shelfLifeDays,
    locationsCount: 1,
    expiryDate: data.expiryDate,
    status: "ACTIVE",
  };
}
