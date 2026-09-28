import { apiFetch } from "./api";
import { renameExpiryLocationMock, updateExpiryMockForProductLocation } from "./mocks/expiry.mock";
import { renameStockLocationMock } from "./mocks/stock.mock";
import { renameDashboardLocationMock } from "./mocks/dashboard.mock";
import type { CatalogProduct, MovementRecord, ReportCard, SaleTransaction, StoreLocation } from "../types/operations";

// Replace mock responses with API endpoints as the backend modules become available.
const USE_MOCK = true;
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
  async listProducts(): Promise<CatalogProduct[]> { return USE_MOCK ? products : apiFetch<CatalogProduct[]>("/products"); },
  async createProduct(product: CatalogProduct, initialStockByLocation: Array<{ locationId: string; quantity: number }>): Promise<CatalogProduct> {
    if (USE_MOCK) {
      const stockByLocation = Object.fromEntries(initialStockByLocation.map((entry) => [entry.locationId, entry.quantity]));
      const expiryByLocation = Object.fromEntries(initialStockByLocation.filter((entry) => entry.quantity > 0).map((entry) => [entry.locationId, product.expiryDate ?? ""]));
      const created = { ...product, id: `p-${Date.now()}`, stockByLocation, expiryByLocation, locationsCount: initialStockByLocation.filter((entry) => entry.quantity > 0).length };
      products.unshift(created);
      return created;
    }
    return apiFetch<CatalogProduct>("/products", { method: "POST", body: JSON.stringify({ ...product, initialStockByLocation }) });
  },
  async updateProduct(product: CatalogProduct): Promise<CatalogProduct> {
    if (USE_MOCK) {
      const index = products.findIndex((item) => item.id === product.id);
      if (index >= 0) products[index] = product;
      return product;
    }
    return apiFetch<CatalogProduct>(`/products/${encodeURIComponent(product.id)}`, { method: "PUT", body: JSON.stringify(product) });
  },
  async updateProductInventory(productId: string, locationId: string, quantity: number, expiryDate: string): Promise<CatalogProduct> {
    if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Informe uma quantidade válida, igual ou maior que zero.");
    if (!expiryDate || Number.isNaN(new Date(`${expiryDate}T00:00:00`).getTime())) throw new Error("Informe uma data de validade válida.");
    if (USE_MOCK) {
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
    return apiFetch<CatalogProduct>(`/products/${encodeURIComponent(productId)}/locations/${encodeURIComponent(locationId)}/inventory`, { method: "PUT", body: JSON.stringify({ quantity, expiryDate }) });
  },
  async updatePrices(ids: string[], prices: { costPrice?: number; salePrice?: number }): Promise<CatalogProduct[]> {
    if (USE_MOCK) {
      return products.filter((item) => ids.includes(item.id)).map((item) => {
        Object.assign(item, prices);
        return item;
      });
    }
    return apiFetch<CatalogProduct[]>("/products/prices", { method: "PATCH", body: JSON.stringify({ ids, ...prices }) });
  },
  async createMovement(movement: Omit<MovementRecord, "id" | "date" | "user" | "status">): Promise<MovementRecord> {
    const created: MovementRecord = { ...movement, id: `m-${Date.now()}`, date: new Date().toISOString(), user: "Paulo Roberto", status: "COMPLETED" };
    if (USE_MOCK) {
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
    } else return apiFetch<MovementRecord>("/stock/movements", { method: "POST", body: JSON.stringify(movement) });
    return created;
  },
  async createLocation(location: Omit<StoreLocation, "id" | "skuCount" | "stockValue" | "lastSync" | "capacity">): Promise<StoreLocation> {
    const created: StoreLocation = { ...location, id: `l-${Date.now()}`, skuCount: 0, stockValue: 0, capacity: 0, lastSync: "Agora" };
    if (USE_MOCK) locations.unshift(created);
    else return apiFetch<StoreLocation>("/locations", { method: "POST", body: JSON.stringify(location) });
    return created;
  },
  async updateLocation(location: StoreLocation): Promise<StoreLocation> {
    if (USE_MOCK) {
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
    return apiFetch<StoreLocation>(`/locations/${encodeURIComponent(location.id)}`, { method: "PUT", body: JSON.stringify(location) });
  },
  async deleteLocation(id: string): Promise<void> {
    if (USE_MOCK) {
      const index = locations.findIndex((item) => item.id === id);
      if (index >= 0) locations.splice(index, 1);
      return;
    }
    await apiFetch<void>(`/locations/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async listMovements(): Promise<MovementRecord[]> { return USE_MOCK ? movements : apiFetch<MovementRecord[]>("/stock/movements"); },
  async listLocations(): Promise<StoreLocation[]> { return USE_MOCK ? locations : apiFetch<StoreLocation[]>("/locations"); },
  async listSales(): Promise<SaleTransaction[]> { return USE_MOCK ? sales : apiFetch<SaleTransaction[]>("/sales"); },
  async listReports(): Promise<ReportCard[]> { return USE_MOCK ? reports : apiFetch<ReportCard[]>("/reports/logistics"); },
};
