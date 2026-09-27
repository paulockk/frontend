import { apiFetch } from "./api";
import type { CatalogProduct, MovementRecord, ReportCard, SaleTransaction, StoreLocation } from "../types/operations";

// Replace mock responses with API endpoints as the backend modules become available.
const USE_MOCK = true;
const products: CatalogProduct[] = [
  { id: "p1", sku: "BEB-COC-350", barcode: "789123456789", name: "Coca-Cola Original 350ml", category: "Bebidas", brand: "Coca-Cola", costPrice: 2.8, salePrice: 5, minimumStock: 150, shelfLifeDays: 180, locationsCount: 6, status: "ACTIVE" },
  { id: "p2", sku: "ALM-SAN-180", barcode: "789654123852", name: "Sanduíche Natural de Frango 180g", category: "Perecíveis", brand: "FreshExpress", costPrice: 5.5, salePrice: 11.5, minimumStock: 40, shelfLifeDays: 5, locationsCount: 4, status: "ACTIVE" },
  { id: "p3", sku: "BEB-AGU-500", barcode: "789987654321", name: "Água Mineral Crystal 500ml", category: "Bebidas", brand: "Crystal", costPrice: 1.2, salePrice: 3.5, minimumStock: 200, shelfLifeDays: 360, locationsCount: 6, status: "ACTIVE" },
  { id: "p4", sku: "SNK-CHO-045", barcode: "789321456987", name: "Chocolate KitKat 41,5g", category: "Snacks e Doces", brand: "Nestlé", costPrice: 2.45, salePrice: 4.9, minimumStock: 80, shelfLifeDays: 240, locationsCount: 5, status: "ACTIVE" },
  { id: "p5", sku: "LAC-IOG-100", barcode: "789741258963", name: "Iogurte Grego Frutas Vermelhas 100g", category: "Laticínios", brand: "Danone", costPrice: 2.9, salePrice: 5.6, minimumStock: 50, shelfLifeDays: 25, locationsCount: 3, status: "REVIEW" },
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
  async createProduct(product: CatalogProduct, initialStockCD: number): Promise<CatalogProduct> {
    if (USE_MOCK) return { ...product, id: `p-${Date.now()}` };
    return apiFetch<CatalogProduct>("/products", { method: "POST", body: JSON.stringify({ ...product, initialStockCD }) });
  },
  async listMovements(): Promise<MovementRecord[]> { return USE_MOCK ? movements : apiFetch<MovementRecord[]>("/stock/movements"); },
  async listLocations(): Promise<StoreLocation[]> { return USE_MOCK ? locations : apiFetch<StoreLocation[]>("/locations"); },
  async listSales(): Promise<SaleTransaction[]> { return USE_MOCK ? sales : apiFetch<SaleTransaction[]>("/sales"); },
  async listReports(): Promise<ReportCard[]> { return USE_MOCK ? reports : apiFetch<ReportCard[]>("/reports/logistics"); },
};
