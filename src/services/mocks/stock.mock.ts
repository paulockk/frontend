import type { StockFilters, StockListItem, StockListResponse } from "../../types/stock";
import type { Category, Location, Product } from "../../types/entities";

const now = "2026-09-27T12:00:00.000Z";
const category: Category[] = [
  { id: "cat-drinks", name: "Bebidas", createdAt: now, updatedAt: now },
  { id: "cat-dairy", name: "Laticínios", createdAt: now, updatedAt: now },
  { id: "cat-snacks", name: "Doces e Snacks", createdAt: now, updatedAt: now },
  { id: "cat-fresh", name: "Perecíveis", createdAt: now, updatedAt: now },
];
const locations: Location[] = [
  { id: "loc-cd", name: "CD", type: "WAREHOUSE", description: "Centro de distribuição", isActive: true, createdAt: now, updatedAt: now },
  { id: "loc-market-1", name: "Mercadinho 1", type: "MARKET", description: null, isActive: true, createdAt: now, updatedAt: now },
  { id: "loc-market-2", name: "Mercadinho 2", type: "MARKET", description: null, isActive: true, createdAt: now, updatedAt: now },
  { id: "loc-vending-1", name: "Vending Machine 01", type: "VENDING_MACHINE", description: null, isActive: true, createdAt: now, updatedAt: now },
];
const products: Product[] = [
  { id: "prod-cola", barcode: "7894900011517", name: "Coca-Cola Lata 350ml", description: null, brand: "The Coca-Cola Company", categoryId: "cat-drinks", unit: "un", minimumStock: 20, purchasePrice: 350, salePrice: 600, isActive: true, createdAt: now, updatedAt: now },
  { id: "prod-milk", barcode: "7891000123450", name: "Leite Integral UHT 1L", description: null, brand: "Piracanjuba", categoryId: "cat-dairy", unit: "un", minimumStock: 15, purchasePrice: 480, salePrice: 750, isActive: true, createdAt: now, updatedAt: now },
  { id: "prod-bar", barcode: "7893214569870", name: "Chocolate Snickers 45g", description: null, brand: "Mars", categoryId: "cat-snacks", unit: "un", minimumStock: 10, purchasePrice: 320, salePrice: 550, isActive: true, createdAt: now, updatedAt: now },
  { id: "prod-sandwich", barcode: "7896541238520", name: "Sanduíche Natural de Frango", description: null, brand: "FreshExpress", categoryId: "cat-fresh", unit: "un", minimumStock: 12, purchasePrice: 900, salePrice: 1500, isActive: true, createdAt: now, updatedAt: now },
  { id: "prod-water", barcode: "7899876543210", name: "Água Mineral 500ml", description: null, brand: "Crystal", categoryId: "cat-drinks", unit: "un", minimumStock: 30, purchasePrice: 150, salePrice: 300, isActive: true, createdAt: now, updatedAt: now },
  { id: "prod-chips", barcode: "7894561237890", name: "Batata Pringles Original 114g", description: null, brand: "Kellogg's", categoryId: "cat-snacks", unit: "un", minimumStock: 12, purchasePrice: 850, salePrice: 1300, isActive: true, createdAt: now, updatedAt: now },
];
const items: StockListItem[] = products.map((product, index) => {
  const location = locations[[1, 2, 3, 1, 0, 3][index]];
  const quantity = [48, 8, 3, 0, 1840, 14][index];
  const expirationDate = ["2026-10-15", "2026-10-01", "2027-01-20", "2026-09-27", "2027-06-10", "2027-02-20"][index];
  const batch = { id: `batch-${index + 1}`, productId: product.id, batchCode: `L2026${String(index + 1).padStart(2, "0")}`, expirationDate, purchasePrice: product.purchasePrice, createdAt: now, updatedAt: now };
  const stock = { id: `stock-${index + 1}`, productId: product.id, batchId: batch.id, locationId: location.id, quantity, updatedAt: now };
  const min = product.minimumStock ?? 0;
  const daysUntilExpiry = Math.ceil((new Date(`${expirationDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return { stock, product, batch, location, category: category.find((entry) => entry.id === product.categoryId)!, status: quantity === 0 ? "OUT_OF_STOCK" : quantity < min ? "LOW" : "NORMAL", daysUntilExpiry };
});

export function getStockMock(filters: StockFilters): StockListResponse {
  const filtered = items.filter((item) => {
    const term = filters.search.trim().toLocaleLowerCase("pt-BR");
    if (term && ![item.product.name, item.product.barcode, item.product.brand ?? ""].some((value) => value.toLocaleLowerCase("pt-BR").includes(term))) return false;
    if (filters.locationId !== "ALL" && item.location.id !== filters.locationId) return false;
    if (filters.categoryId !== "ALL" && item.category.id !== filters.categoryId) return false;
    if (filters.status !== "ALL" && item.status !== filters.status) return false;
    if (filters.lowStockOnly && item.status === "NORMAL") return false;
    if (filters.expiry === "SAFE" && (item.daysUntilExpiry === null || item.daysUntilExpiry <= 30)) return false;
    if (["7", "15", "30"].includes(filters.expiry) && (item.daysUntilExpiry === null || item.daysUntilExpiry < 0 || item.daysUntilExpiry > Number(filters.expiry))) return false;
    return true;
  });
  const start = (filters.page - 1) * filters.pageSize;
  return {
    items: filtered.slice(start, start + filters.pageSize),
    summary: {
      totalUnits: items.reduce((sum, item) => sum + item.stock.quantity, 0),
      totalCost: items.reduce((sum, item) => sum + item.stock.quantity * item.product.purchasePrice, 0),
      normalProducts: items.filter((item) => item.status === "NORMAL").length,
      lowStockProducts: items.filter((item) => item.status === "LOW").length,
      outOfStockProducts: items.filter((item) => item.status === "OUT_OF_STOCK").length,
    },
    locations, categories: category,
    pagination: { page: filters.page, pageSize: filters.pageSize, totalItems: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / filters.pageSize)) },
  };
}
