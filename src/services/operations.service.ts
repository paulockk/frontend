import { apiFetch } from "./api";
import { renameExpiryLocationMock, updateExpiryMockForProductLocation } from "./mocks/expiry.mock";
import { renameStockLocationMock } from "./mocks/stock.mock";
import { renameDashboardLocationMock } from "./mocks/dashboard.mock";
import type { CatalogProduct, MovementRecord, ReportCard, SaleTransaction, StoreLocation } from "../types/operations";

// Replace mock responses with API endpoints as the backend modules become available.
const USE_MOCK = true;
const USE_API_FOR_LOCATIONS = true;
const USE_API_FOR_MOVEMENTS = true;
const USE_API_FOR_PRODUCTS = true;
let cachedApiProducts: CatalogProduct[] = [];
type ApiLocation = { id: string; name: string; type: StoreLocation["type"]; address: string | null; status: StoreLocation["status"] };
type ApiProduct = {
  id: string; sku: string; name: string; description: string | null; barcode: string | null;
  category: string | null; costPrice: string; salePrice: string; defaultShelfLifeDays: number | null;
  isActive: boolean; unit: string; tracksExpiration: boolean;
};
type ApiMovement = {
  id: string; type: MovementRecord["type"]; sku: string; productName: string;
  quantity: string; batchNumber: string | null; performedBy: string; createdAt: string;
  location: string | null; sourceLocation: string | null; destinationLocation: string | null;
};
type ApiProductLot = { productId: string; locationId: string; quantity: string; expiryDate: string | null };
const fromApiLocation = (location: ApiLocation): StoreLocation => ({
  ...location,
  address: location.address ?? "",
  skuCount: 0,
  stockValue: 0,
  capacity: 0,
  lastSync: "",
});
const fromApiProduct = (product: ApiProduct): CatalogProduct => {
  const cached = cachedApiProducts.find((item) => item.id === product.id);
  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode ?? "",
    name: product.name,
    unit: product.unit,
  tracksExpiration: product.tracksExpiration,
    category: product.category ?? "Sem categoria",
    brand: product.description ?? "",
    costPrice: Number(product.costPrice),
    salePrice: Number(product.salePrice),
    minimumStock: cached?.minimumStock ?? 0,
    shelfLifeDays: product.defaultShelfLifeDays ?? 0,
    locationsCount: cached?.locationsCount ?? 0,
    stockByLocation: cached?.stockByLocation,
    expiryByLocation: cached?.expiryByLocation,
    status: product.isActive ? "ACTIVE" : "INACTIVE",
  };
};
const toMoneyString = (value: number) => value.toFixed(2);
async function categoryIdByName(name: string): Promise<string | null> {
  if (name === "Sem categoria") return null;
  const result = await apiFetch<{ items: Array<{ id: string; name: string }> }>("/categories?page=1&pageSize=100");
  const existing = result.items.find((category) => category.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (existing) return existing.id;
  const created = await apiFetch<{ category: { id: string } }>("/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return created.category.id;
}
const dateFromToday = (days: number) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
const products: CatalogProduct[] = [
  { id: "p1", sku: "BEB-COC-350", barcode: "789123456789", name: "Coca-Cola Original 350ml", category: "Bebidas", brand: "Coca-Cola", costPrice: 2.8, salePrice: 5, minimumStock: 150, shelfLifeDays: 180, locationsCount: 3, stockByLocation: { l1: 360, l2: 5, l3: 8 }, expiryByLocation: { l1: dateFromToday(182), l2: dateFromToday(90), l3: dateFromToday(120) }, status: "ACTIVE" },
  { id: "p2", sku: "ALM-SAN-180", barcode: "789654123852", name: "Sanduíche Natural de Frango 180g", category: "Perecíveis", brand: "FreshExpress", costPrice: 5.5, salePrice: 11.5, minimumStock: 40, shelfLifeDays: 5, locationsCount: 1, stockByLocation: { l2: 6 }, expiryByLocation: { l2: dateFromToday(4) }, status: "ACTIVE" },
  { id: "p3", sku: "BEB-AGU-500", barcode: "789987654321", name: "Água Mineral Crystal 500ml", category: "Bebidas", brand: "Crystal", costPrice: 1.2, salePrice: 3.5, minimumStock: 200, shelfLifeDays: 360, locationsCount: 2, stockByLocation: { l1: 140, l3: 24 }, expiryByLocation: { l1: dateFromToday(360), l3: dateFromToday(360) }, status: "ACTIVE" },
  { id: "p4", sku: "SNK-CHO-045", barcode: "789321456987", name: "Chocolate KitKat 41,5g", category: "Snacks e Doces", brand: "Nestlé", costPrice: 2.45, salePrice: 4.9, minimumStock: 80, shelfLifeDays: 240, locationsCount: 2, stockByLocation: { l2: 12, l3: 18 }, expiryByLocation: { l2: dateFromToday(240), l3: dateFromToday(240) }, status: "ACTIVE" },
  { id: "p5", sku: "LAC-IOG-100", barcode: "789741258963", name: "Iogurte Grego Frutas Vermelhas 100g", category: "Laticínios", brand: "Danone", costPrice: 2.9, salePrice: 5.6, minimumStock: 50, shelfLifeDays: 25, locationsCount: 2, stockByLocation: { l2: 24, l3: 0 }, expiryByLocation: { l2: dateFromToday(25), l3: dateFromToday(25) }, status: "REVIEW" },
];
const movements: MovementRecord[] = [
  { id: "m1", date: "2026-09-27T09:15:00", type: "TRANSFER", productName: "Coca-Cola Original 350ml", sku: "BEB-COC-350", quantity: 48, origin: "CD", destination: "Mercadinho 1", batch: "LT-88201", user: "Paulo Roberto", status: "COMPLETED" },
  { id: "m2", date: "2026-09-27T08:42:00", type: "ENTRY", productName: "Água Mineral Crystal 500ml", sku: "BEB-AGU-500", quantity: 240, origin: null, destination: "CD", batch: "LT-90411", user: "Paulo Roberto", status: "COMPLETED" },
  { id: "m3", date: "2026-09-26T17:30:00", type: "ADJUSTMENT", productName: "Iogurte Grego Frutas Vermelhas 100g", sku: "LAC-IOG-100", quantity: -2, origin: "Mercadinho 2", destination: "Mercadinho 2", batch: "LT-77012", user: "Ana Silva", status: "PENDING" },
  { id: "m4", date: "2026-09-26T15:10:00", type: "EXIT", productName: "Sanduíche Natural de Frango 180g", sku: "ALM-SAN-180", quantity: 12, origin: "CD", destination: null, batch: "LT-90112", user: "Paulo Roberto", status: "COMPLETED" },
];
const locations: StoreLocation[] = [
  { id: "l1", name: "CD", type: "WAREHOUSE", address: "Centro de distribuição", status: "ACTIVE", skuCount: 1248, stockValue: 218450, capacity: 72, lastSync: "Há 2 min" },
  { id: "l2", name: "Mercadinho 1", type: "MARKET", address: "Unidade central", status: "ACTIVE", skuCount: 486, stockValue: 38420, capacity: 64, lastSync: "Há 5 min" },
  { id: "l3", name: "Mercadinho 2", type: "MARKET", address: "Unidade norte", status: "ACTIVE", skuCount: 412, stockValue: 29750, capacity: 81, lastSync: "Há 8 min" },
  { id: "l4", name: "Vending Machine 01", type: "VENDING_MACHINE", address: "Unidade central · térreo", status: "MAINTENANCE", skuCount: 42, stockValue: 2860, capacity: 38, lastSync: "Há 1 hora" },
];
const sales: SaleTransaction[] = [
  { id: "s1", receipt: "VD-20260927-0384", date: "2026-09-27T10:42:00", location: "Mercadinho 1", items: "2 itens · Coca-Cola, KitKat", payment: "Cartão", total: 9.9, status: "COMPLETED" },
  { id: "s2", receipt: "VD-20260927-0383", date: "2026-09-27T10:39:00", location: "Vending Machine 01", items: "1 item · Água Mineral", payment: "PIX", total: 3.5, status: "COMPLETED" },
  { id: "s3", receipt: "VD-20260927-0382", date: "2026-09-27T10:31:00", location: "Mercadinho 2", items: "1 item · Sanduíche Natural", payment: "PIX", total: 11.5, status: "REVERSED" },
];
const reports: ReportCard[] = [
  { id: "expiry", badge: "ALTA PRIORIDADE", title: "Prevenção de perdas e validades", description: "Lotes próximos do vencimento, histórico de baixas e conformidade PEPS.", metricLabel: "Lotes críticos", metric: "14 lotes", secondaryLabel: "Conformidade PEPS", secondaryMetric: "99,8%" },
  { id: "abc", badge: "CURVA ABC", title: "Giro de estoque e curva ABC", description: "Classificação de produtos por vendas, giro e participação na receita.", metricLabel: "Classe A", metric: "42 SKUs", secondaryLabel: "Baixo giro", secondaryMetric: "6 SKUs" },
  { id: "replenishment", badge: "REABASTECIMENTO", title: "Rupturas e reposição", description: "Itens abaixo do estoque mínimo com sugestão de reposição por unidade.", metricLabel: "Alertas ativos", metric: "9 itens", secondaryLabel: "Tempo médio", secondaryMetric: "3,4 horas" },
  { id: "audit", badge: "AUDITORIA", title: "Auditoria de movimentações", description: "Rastreabilidade de transferências, remessas entre CD e pontos de venda.", metricLabel: "Guias auditadas", metric: "184 guias", secondaryLabel: "Divergências", secondaryMetric: "0" },
  { id: "finance", badge: "FINANCEIRO", title: "Custo de inventário", description: "Valor patrimonial, custo médio e margem por unidade física.", metricLabel: "Margem média", metric: "38,2%", secondaryLabel: "Giro médio", secondaryMetric: "12,4 dias" },
  { id: "forecast", badge: "PREVISÃO", title: "Demanda e inteligência logística", description: "Projeções de compra considerando histórico, sazonalidade e consumo local.", metricLabel: "Confiança", metric: "96,7%", secondaryLabel: "Sugestões", secondaryMetric: "28 lotes" },
];

export const operationsService = {
  async findProductByBarcode(barcode: string): Promise<CatalogProduct | null> {
    const normalizedBarcode = barcode.trim();
    if (!normalizedBarcode) return null;
    const query = new URLSearchParams({ page: "1", pageSize: "100", search: normalizedBarcode });
    const result = await apiFetch<{ items: ApiProduct[] }>(`/products?${query}`);
    const match = result.items.find((item) => item.barcode?.trim() === normalizedBarcode);
    return match ? fromApiProduct(match) : null;
  },
  async listProducts(): Promise<CatalogProduct[]> {
    if (!USE_API_FOR_PRODUCTS) return products;
    const [result, firstLots] = await Promise.all([
      apiFetch<{ items: ApiProduct[] }>("/products?page=1&pageSize=100"),
      apiFetch<{ items: ApiProductLot[]; pagination: { totalPages: number } }>("/stock/lots?page=1&pageSize=100"),
    ]);
    const otherLots = await Promise.all(Array.from(
      { length: Math.max(0, firstLots.pagination.totalPages - 1) },
      (_, index) => apiFetch<{ items: ApiProductLot[] }>(`/stock/lots?page=${index + 2}&pageSize=100`),
    ));
    const lots = [firstLots, ...otherLots].flatMap((page) => page.items);
    cachedApiProducts = result.items.map((item) => {
      const product = fromApiProduct(item);
      const productLots = lots.filter((lot) => lot.productId === item.id);
      const stockByLocation: Record<string, number> = {};
      const expiryByLocation: Record<string, string> = {};
      for (const lot of productLots) {
        stockByLocation[lot.locationId] = (stockByLocation[lot.locationId] ?? 0) + Number(lot.quantity);
        if (lot.expiryDate && !expiryByLocation[lot.locationId]) expiryByLocation[lot.locationId] = lot.expiryDate;
      }
      product.stockByLocation = stockByLocation;
      product.expiryByLocation = expiryByLocation;
      product.locationsCount = new Set(productLots.filter((lot) => Number(lot.quantity) > 0).map((lot) => lot.locationId)).size;
      return product;
    });
    return cachedApiProducts;
  },
  async createProduct(product: CatalogProduct, initialStockByLocation: Array<{ locationId: string; quantity: number }>): Promise<CatalogProduct> {
    if (!USE_API_FOR_PRODUCTS) {
      const stockByLocation = Object.fromEntries(initialStockByLocation.map((entry) => [entry.locationId, entry.quantity]));
      const expiryByLocation = Object.fromEntries(initialStockByLocation.filter((entry) => entry.quantity > 0).map((entry) => [entry.locationId, product.expiryDate ?? ""]));
      const created = { ...product, id: `p-${Date.now()}`, stockByLocation, expiryByLocation, locationsCount: initialStockByLocation.filter((entry) => entry.quantity > 0).length };
      products.unshift(created);
      return created;
    }
    if (!["UN", "KG", "G", "L", "ML", "M"].includes(product.unit ?? "UN")) {
      throw new Error("A API aceita unidades UN, KG, G, L, ML e M para novos produtos.");
    }
    const categoryId = await categoryIdByName(product.category);
    const created = await apiFetch<{ product: ApiProduct }>("/products", {
      method: "POST",
      body: JSON.stringify({
        sku: product.sku,
        name: product.name,
        description: product.brand || null,
        barcode: product.barcode || null,
        categoryId,
        unit: product.unit ?? "UN",
        costPrice: toMoneyString(product.costPrice),
        salePrice: toMoneyString(product.salePrice),
        tracksExpiration: product.tracksExpiration ?? product.shelfLifeDays > 0,
        defaultShelfLifeDays: (product.tracksExpiration ?? product.shelfLifeDays > 0) ? product.shelfLifeDays : null,
      }),
    });
    const saved = fromApiProduct(created.product);
    for (const entry of initialStockByLocation.filter((item) => item.quantity > 0)) {
      await apiFetch("/stock/movements", {
        method: "POST",
        body: JSON.stringify({
          type: "ENTRY",
          productId: saved.id,
          locationId: entry.locationId,
          quantity: String(entry.quantity),
          expiryDate: (product.tracksExpiration ?? product.shelfLifeDays > 0) ? product.expiryDate || null : null,
        }),
      });
    }
    return (await this.listProducts()).find((item) => item.id === saved.id) ?? saved;
  },
  async updateProduct(product: CatalogProduct): Promise<CatalogProduct> {
    if (!USE_API_FOR_PRODUCTS) {
      const index = products.findIndex((item) => item.id === product.id);
      if (index >= 0) products[index] = product;
      return product;
    }
    const categoryId = await categoryIdByName(product.category);
    const result = await apiFetch<{ product: ApiProduct }>(`/products/${encodeURIComponent(product.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: product.name,
        description: product.brand || null,
        categoryId,
        costPrice: toMoneyString(product.costPrice),
        salePrice: toMoneyString(product.salePrice),
        tracksExpiration: product.tracksExpiration ?? product.shelfLifeDays > 0,
        defaultShelfLifeDays: (product.tracksExpiration ?? product.shelfLifeDays > 0) ? product.shelfLifeDays : null,
        isActive: product.status !== "INACTIVE",
      }),
    });
    return fromApiProduct(result.product);
  },
  async updateProductInventory(productId: string, locationId: string, quantity: number, expiryDate: string): Promise<CatalogProduct> {
    if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Informe uma quantidade válida, igual ou maior que zero.");
    if (!expiryDate || Number.isNaN(new Date(`${expiryDate}T00:00:00`).getTime())) throw new Error("Informe uma data de validade válida.");
    if (!USE_API_FOR_PRODUCTS) {
      const product = products.find((item) => item.id === productId);
      const location = locations.find((item) => item.id === locationId);
      if (!product || !location) throw new Error("Produto ou local não encontrado.");
      const stockByLocation = { ...(product.stockByLocation ?? {}), [locationId]: quantity };
      const expiryByLocation = { ...(product.expiryByLocation ?? {}), [locationId]: expiryDate };
      product.stockByLocation = stockByLocation;
      product.expiryByLocation = expiryByLocation;
      product.expiryDate = expiryDate;
      product.locationsCount = Object.values(stockByLocation).filter((value) => value > 0).length;
      updateExpiryMockForProductLocation(product.sku, location.name, expiryDate);
      return product;
    }
    const product = cachedApiProducts.find((item) => item.id === productId)
      ?? (await this.listProducts()).find((item) => item.id === productId);
    if (!product) throw new Error("Produto não encontrado.");
    const query = new URLSearchParams({ page: "1", pageSize: "100", productId, locationId });
    const firstPage = await apiFetch<{ items: Array<{ batchId: string; quantity: string; expiryDate: string | null }>; pagination: { totalPages: number } }>(`/stock/lots?${query}`);
    const otherPages = await Promise.all(Array.from(
      { length: Math.max(0, firstPage.pagination.totalPages - 1) },
      (_, index) => apiFetch<{ items: Array<{ batchId: string; quantity: string; expiryDate: string | null }> }>(`/stock/lots?${query.toString().replace("page=1", `page=${index + 2}`)}`),
    ));
    const lots = [firstPage, ...otherPages].flatMap((page) => page.items);
    const currentQuantity = lots.reduce((sum, lot) => sum + Number(lot.quantity), 0);
    if ((product.tracksExpiration ?? product.shelfLifeDays > 0) && lots.some((lot) => lot.expiryDate !== expiryDate)) {
      throw new Error("A API não permite alterar a validade de um lote já registrado.");
    }
    if (quantity > currentQuantity) {
      await apiFetch("/stock/movements", {
        method: "POST",
        body: JSON.stringify({ type: "ENTRY", productId, locationId, quantity: String(quantity - currentQuantity), expiryDate: (product.tracksExpiration ?? product.shelfLifeDays > 0) ? expiryDate : null }),
      });
    } else if (quantity < currentQuantity) {
      let remaining = currentQuantity - quantity;
      for (const lot of lots) {
        if (remaining <= 0) break;
        const removed = Math.min(remaining, Number(lot.quantity));
        await apiFetch("/stock/movements", {
          method: "POST",
          body: JSON.stringify({ type: "EXIT", batchId: lot.batchId, quantity: String(removed) }),
        });
        remaining -= removed;
      }
    }
    return (await this.listProducts()).find((item) => item.id === productId) ?? product;
  },
  async updatePrices(ids: string[], prices: { costPrice?: number; salePrice?: number }): Promise<CatalogProduct[]> {
    if (!USE_API_FOR_PRODUCTS) {
      return products.filter((item) => ids.includes(item.id)).map((item) => {
        Object.assign(item, prices);
        return item;
      });
    }
    const updated = await Promise.all(ids.map(async (id) => {
      const result = await apiFetch<{ product: ApiProduct }>(`/products/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(prices.costPrice === undefined ? {} : { costPrice: toMoneyString(prices.costPrice) }),
          ...(prices.salePrice === undefined ? {} : { salePrice: toMoneyString(prices.salePrice) }),
        }),
      });
      return fromApiProduct(result.product);
    }));
    return updated;
  },
  async createMovement(movement: Omit<MovementRecord, "id" | "date" | "user" | "status">): Promise<MovementRecord> {
    const created: MovementRecord = { ...movement, id: `m-${Date.now()}`, date: new Date().toISOString(), user: "Paulo Roberto", status: "COMPLETED" };
    if (!USE_API_FOR_MOVEMENTS) {
      const product = products.find((item) => item.sku === movement.sku);
      if (!product) throw new Error("Produto não encontrado no catálogo.");
      const origin = locations.find((location) => location.name === movement.origin);
      const destination = locations.find((location) => location.name === movement.destination);
      const deductFromOrigin = movement.type === "EXIT" || movement.type === "TRANSFER";
      const addToDestination = movement.type === "ENTRY" || movement.type === "TRANSFER";
      if (deductFromOrigin && !origin) throw new Error("Selecione o local de origem da movimentação.");
      if (addToDestination && !destination) throw new Error("Selecione o local de destino da movimentação.");
      if (movement.type === "TRANSFER" && origin?.id === destination?.id) throw new Error("Origem e destino precisam ser locais diferentes.");
      const stockByLocation = { ...(product.stockByLocation ?? {}) };
      if (origin && deductFromOrigin) {
        const currentQuantity = stockByLocation[origin.id] ?? 0;
        if (currentQuantity < movement.quantity) throw new Error(`Estoque insuficiente em ${origin.name}. Disponível: ${currentQuantity}.`);
        stockByLocation[origin.id] = currentQuantity - movement.quantity;
      }
      if (destination && addToDestination) stockByLocation[destination.id] = (stockByLocation[destination.id] ?? 0) + movement.quantity;
      if (movement.type === "ADJUSTMENT") {
        const adjustmentLocation = destination ?? origin;
        if (!adjustmentLocation) throw new Error("Selecione o local do ajuste.");
        stockByLocation[adjustmentLocation.id] = (stockByLocation[adjustmentLocation.id] ?? 0) + movement.quantity;
      }
      product.stockByLocation = stockByLocation;
      product.locationsCount = Object.values(stockByLocation).filter((quantity) => quantity > 0).length;
      movements.unshift(created);
    } else {
      const product = cachedApiProducts.find((item) => item.sku === movement.sku)
        ?? (await this.listProducts()).find((item) => item.sku === movement.sku);
      const locationsResult = await apiFetch<{ items: ApiLocation[] }>("/locations?page=1&pageSize=100");
      const origin = locationsResult.items.find((location) => location.name === movement.origin);
      const destination = locationsResult.items.find((location) => location.name === movement.destination);
      if (!product) throw new Error("Produto não encontrado no catálogo carregado.");
      if (movement.type === "ADJUSTMENT") throw new Error("A API atual não oferece movimentação do tipo ajuste.");
      if (movement.type === "ENTRY") {
        if (!destination) throw new Error("Selecione um local de destino válido.");
        const expiryDate = (product.tracksExpiration ?? product.shelfLifeDays > 0)
          ? new Date(Date.now() + product.shelfLifeDays * 86_400_000).toISOString().slice(0, 10)
          : null;
        const response = await apiFetch<{ movement: { id: string; createdAt: string; batchNumber: string | null } }>("/stock/movements", {
          method: "POST",
          body: JSON.stringify({ type: "ENTRY", productId: product.id, locationId: destination.id, quantity: String(movement.quantity), batchNumber: movement.batch === "—" ? null : movement.batch, expiryDate }),
        });
        return { ...movement, id: response.movement.id, date: response.movement.createdAt, batch: response.movement.batchNumber ?? "—", user: "Usuário autenticado", status: "COMPLETED" };
      }
      if (!origin) throw new Error("Selecione um local de origem válido.");
      const lots = await apiFetch<{ items: Array<{ batchId: string; batchNumber: string | null; quantity: string }> }>(`/stock/lots?page=1&pageSize=100&productId=${encodeURIComponent(product.id)}&locationId=${encodeURIComponent(origin.id)}`);
      const sourceBatch = lots.items.find((lot) => !movement.batch || movement.batch === "—" || lot.batchNumber === movement.batch);
      if (!sourceBatch) throw new Error("Não há lote compatível com o produto e local selecionados.");
      if (Number(sourceBatch.quantity) < movement.quantity) throw new Error(`Saldo insuficiente no lote. Disponível: ${sourceBatch.quantity}.`);
      if (movement.type === "TRANSFER") {
        if (!destination) throw new Error("Selecione um local de destino válido.");
        const response = await apiFetch<{ transfer: { id: string; createdAt: string; batchNumber: string | null } }>("/stock/transfers", {
          method: "POST",
          body: JSON.stringify({ sourceBatchId: sourceBatch.batchId, destinationLocationId: destination.id, quantity: String(movement.quantity) }),
        });
        return { ...movement, id: response.transfer.id, date: response.transfer.createdAt, batch: response.transfer.batchNumber ?? "—", user: "Usuário autenticado", status: "COMPLETED" };
      }
      const response = await apiFetch<{ movement: { id: string; createdAt: string; batchNumber: string | null } }>("/stock/movements", {
        method: "POST",
        body: JSON.stringify({ type: "EXIT", batchId: sourceBatch.batchId, quantity: String(movement.quantity) }),
      });
      return { ...movement, id: response.movement.id, date: response.movement.createdAt, batch: response.movement.batchNumber ?? "—", user: "Usuário autenticado", status: "COMPLETED" };
    }
    return created;
  },
  async createLocation(location: Omit<StoreLocation, "id" | "skuCount" | "stockValue" | "lastSync" | "capacity">): Promise<StoreLocation> {
    if (!USE_API_FOR_LOCATIONS) {
      const created: StoreLocation = { ...location, id: `l-${Date.now()}`, skuCount: 0, stockValue: 0, capacity: 0, lastSync: "Agora" };
      locations.unshift(created);
      return created;
    }
    const result = await apiFetch<{ location: ApiLocation }>("/locations", { method: "POST", body: JSON.stringify(location) });
    return fromApiLocation(result.location);
  },
  async updateLocation(location: StoreLocation): Promise<StoreLocation> {
    if (!USE_API_FOR_LOCATIONS) {
      const index = locations.findIndex((item) => item.id === location.id);
      if (index >= 0) {
        const previous = locations[index];
        const legacyNames: Record<string, string[]> = {
          l1: ["CD", "Estoque", "Centro de distribuição"],
          l2: ["Mercadinho 1", "Mercado Principal", "Unidade central"],
          l3: ["Mercadinho 2", "Mercadinho Norte", "Unidade norte"],
          l4: ["Vending Machine 01", "Vending Machine 1", "Máquina 01"],
        };
        const namesToRename = [...new Set([previous.name, ...(legacyNames[location.id] ?? [])])];
        locations[index] = location;
        movements.forEach((movement) => {
          if (movement.origin && namesToRename.includes(movement.origin)) movement.origin = location.name;
          if (movement.destination && namesToRename.includes(movement.destination)) movement.destination = location.name;
        });
        sales.forEach((sale) => { if (namesToRename.includes(sale.location)) sale.location = location.name; });
        renameExpiryLocationMock(namesToRename, location.name);
        renameStockLocationMock(namesToRename, location.name);
        renameDashboardLocationMock(namesToRename, location.name);
      }
      return location;
    }
    const result = await apiFetch<{ location: ApiLocation }>(`/locations/${encodeURIComponent(location.id)}`, { method: "PUT", body: JSON.stringify({ name: location.name, address: location.address || null, type: location.type, status: location.status }) });
    return fromApiLocation(result.location);
  },
  async deleteLocation(id: string): Promise<void> {
    if (!USE_API_FOR_LOCATIONS) {
      const index = locations.findIndex((item) => item.id === id);
      if (index >= 0) locations.splice(index, 1);
      return;
    }
    await apiFetch<{ success: true }>(`/locations/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async listMovements(): Promise<MovementRecord[]> {
    if (!USE_API_FOR_MOVEMENTS) return movements;
    const result = await apiFetch<{ items: ApiMovement[] }>("/stock/movements?page=1&pageSize=100");
    return result.items.map((movement) => ({
      id: movement.id,
      date: movement.createdAt,
      type: movement.type,
      productName: movement.productName,
      sku: movement.sku,
      quantity: Number(movement.quantity),
      origin: movement.sourceLocation ?? (movement.type === "EXIT" ? movement.location : null),
      destination: movement.destinationLocation ?? (movement.type === "ENTRY" ? movement.location : null),
      batch: movement.batchNumber ?? "—",
      user: movement.performedBy,
      status: "COMPLETED",
    }));
  },
  async listLocations(): Promise<StoreLocation[]> {
    if (!USE_API_FOR_LOCATIONS) return locations;
    const result = await apiFetch<{ items: ApiLocation[] }>("/locations?page=1&pageSize=100");
    return result.items.map(fromApiLocation);
  },
  async listSales(): Promise<SaleTransaction[]> {
    throw new Error("A API atual ainda não oferece um endpoint de vendas.");
  },
  async listReports(): Promise<ReportCard[]> { return USE_MOCK ? reports : apiFetch<ReportCard[]>("/reports/logistics"); },
};
