import type { ExpiryFilters, ExpiryListResponse, ExpiryLot, ExpirySeverity } from "../../types/expiry";

const today = new Date();
today.setHours(0, 0, 0, 0);
const dateIn = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const severityFor = (days: number): ExpirySeverity => days < 0 ? "EXPIRED" : days <= 7 ? "CRITICAL" : days <= 15 ? "WARNING" : "REGULAR";

const seed: Omit<ExpiryLot, "severity">[] = [
  { id: "expiry-001", sku: "PER-008", barcode: "7896541238520", productName: "Sanduíche Natural de Frango", category: "Perecíveis", location: "Mercadinho 1", batchNumber: "LT-90112", expiryDate: dateIn(-1), daysRemaining: -1, quantity: 6, unit: "un", totalCost: 54, recommendedAction: "Retirar e registrar perda" },
  { id: "expiry-002", sku: "LAC-004", barcode: "7897412589630", productName: "Iogurte Grego Tradicional 100g", category: "Laticínios", location: "Mercadinho 1", batchNumber: "LT-88210", expiryDate: dateIn(2), daysRemaining: 2, quantity: 24, unit: "un", totalCost: 115.2, recommendedAction: "Priorizar saída pelo PEPS" },
  { id: "expiry-003", sku: "SNK-042", barcode: "7893214569870", productName: "Sanduíche Natural Peito de Peru", category: "Perecíveis", location: "Vending Machine 01", batchNumber: "LT-90144", expiryDate: dateIn(3), daysRemaining: 3, quantity: 12, unit: "un", totalCost: 108, recommendedAction: "Recolher para consumo imediato" },
  { id: "expiry-004", sku: "LAC-019", barcode: "7891000123450", productName: "Leite Fermentado 6x80g", category: "Laticínios", location: "Mercadinho 2", batchNumber: "LT-77402", expiryDate: dateIn(5), daysRemaining: 5, quantity: 18, unit: "un", totalCost: 86.4, recommendedAction: "Priorizar reposição PEPS" },
  { id: "expiry-005", sku: "DOC-112", barcode: "7894561237890", productName: "Bolo de Pote Cenoura com Chocolate", category: "Doces e Snacks", location: "Vending Machine 02", batchNumber: "LT-91022", expiryDate: dateIn(7), daysRemaining: 7, quantity: 8, unit: "un", totalCost: 72, recommendedAction: "Remanejar para ponto de maior giro" },
  { id: "expiry-006", sku: "BEB-089", barcode: "7899876543210", productName: "Suco Integral de Laranja 300ml", category: "Bebidas", location: "CD", batchNumber: "LT-66109", expiryDate: dateIn(12), daysRemaining: 12, quantity: 140, unit: "un", totalCost: 490, recommendedAction: "Expedir para unidades pela regra PEPS" },
  { id: "expiry-007", sku: "BEB-001", barcode: "7891234567890", productName: "Refrigerante Cola Lata 350ml", category: "Bebidas", location: "CD", batchNumber: "LT-55341", expiryDate: dateIn(182), daysRemaining: 182, quantity: 360, unit: "un", totalCost: 1080, recommendedAction: "Estoque seguro em armazenagem" },
];
const lots: ExpiryLot[] = seed.map((lot) => ({ ...lot, severity: severityFor(lot.daysRemaining) }));
const severities: ExpirySeverity[] = ["EXPIRED", "CRITICAL", "WARNING", "REGULAR"];

export function getExpiryMock(filters: ExpiryFilters): ExpiryListResponse {
  const term = filters.search.trim().toLocaleLowerCase("pt-BR");
  const filtered = lots.filter((lot) =>
    (!term || [lot.productName, lot.sku, lot.barcode, lot.batchNumber].some((value) => value.toLocaleLowerCase("pt-BR").includes(term))) &&
    (filters.location === "ALL" || lot.location === filters.location) &&
    (filters.category === "ALL" || lot.category === filters.category) &&
    (filters.severity === "ALL" || lot.severity === filters.severity),
  );
  const start = (filters.page - 1) * filters.pageSize;
  return {
    items: filtered.slice(start, start + filters.pageSize),
    summary: severities.map((severity) => {
      const group = lots.filter((lot) => lot.severity === severity);
      return { severity, lotCount: group.length, totalCost: group.reduce((sum, lot) => sum + lot.totalCost, 0) };
    }),
    locations: [...new Set(lots.map((lot) => lot.location))],
    categories: [...new Set(lots.map((lot) => lot.category))],
    pagination: { page: filters.page, pageSize: filters.pageSize, totalItems: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / filters.pageSize)) },
  };
}
