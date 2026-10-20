import { readVmPayTabularFile } from "./vmpay-import.service";

export interface VmPaySaleRow {
  externalId: string;
  receipt: string;
  occurredAt: string;
  dateLabel: string;
  locationKey: string;
  locationLabel: string;
  productCode: string;
  productName: string;
  quantity: number;
  value: number;
  issue?: string;
}

const normalizeHeader = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");

function parseNumber(value: unknown): number | null {
  const source = String(value ?? "").trim().replace(/R\$|\s/gi, "");
  if (!source) return null;
  const parsed = Number(source.includes(",") ? source.replace(/\./g, "").replace(",", ".") : source);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseDate(value: unknown): string | null {
  const source = String(value ?? "").trim();
  if (!source) return null;
  if (/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(source)) {
    const parsed = new Date(source);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const brazilDate = source.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!brazilDate) return null;
  const [, day, month, year, hour = "0", minute = "0", second = "0"] = brazilDate;
  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  const dateCheck = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
  if (dateCheck.getUTCFullYear() !== yearNumber || dateCheck.getUTCMonth() !== monthNumber - 1 || dateCheck.getUTCDate() !== dayNumber
    || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  const iso = `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}T${hour!.padStart(2, "0")}:${minute!.padStart(2, "0")}:${second!.padStart(2, "0")}-03:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function fingerprint(value: string, occurrence: number): Promise<string> {
  const source = new TextEncoder().encode(`${value}\n${occurrence}`);
  if (globalThis.crypto?.subtle) {
    const hash = await globalThis.crypto.subtle.digest("SHA-256", source);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 40).toUpperCase();
  }
  let hash = 2166136261;
  for (const byte of source) hash = Math.imul(hash ^ byte, 16777619);
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export async function parseVmPaySalesFile(file: File): Promise<VmPaySaleRow[]> {
  const rows = await readVmPayTabularFile(file);
  const headerIndex = rows.findIndex((row) => {
    const header = row.map((value) => normalizeHeader(String(value ?? "")));
    return ["data", "local", "codigodoproduto", "produto", "quantidade", "valor"].every((name) => header.includes(name));
  });
  if (headerIndex < 0) throw new Error("Não encontrei as colunas Data, Local, Código do produto, Produto, Quantidade e Valor. Envie o relatório de vendas do VMpay.");
  const header = rows[headerIndex]!.map((value) => normalizeHeader(String(value ?? "")));
  const column = (name: string) => header.indexOf(name);
  const indexes = {
    date: column("data"), location: column("local"), internal: column("localinterno"), machine: column("maquina"),
    channel: column("canaleta"), code: column("codigodoproduto"), name: column("produto"), quantity: column("quantidade"), value: column("valor"),
  };
  const pending: Array<Omit<VmPaySaleRow, "externalId" | "receipt"> & { fingerprint: string }> = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const productName = String(row[indexes.name] ?? "").trim();
    if (!productName) continue;
    const dateLabel = String(row[indexes.date] ?? "").trim();
    const occurredAt = parseDate(dateLabel);
    const productCode = String(row[indexes.code] ?? "").trim();
    const quantity = parseNumber(row[indexes.quantity]);
    const value = parseNumber(row[indexes.value]);
    const local = String(row[indexes.location] ?? "").trim();
    const internal = indexes.internal < 0 ? "" : String(row[indexes.internal] ?? "").trim();
    const machine = indexes.machine < 0 ? "" : String(row[indexes.machine] ?? "").trim();
    const channel = indexes.channel < 0 ? "" : String(row[indexes.channel] ?? "").trim();
    const locationKey = JSON.stringify([local, internal, machine]);
    const locationLabel = [local, internal, machine].filter(Boolean).join(" · ");
    // Keep the import key stable if VMpay later corrects the product label, quantity, or price.
    // The occurrence number below distinguishes repeated identical lines in the same export.
    const rowFingerprint = JSON.stringify([dateLabel, local, internal, machine, channel, productCode]);
    const issues = [
      !occurredAt && "Data/hora inválida.",
      !productCode && "Código do produto ausente.",
      quantity === null || quantity <= 0 ? "Quantidade inválida." : "",
      value === null ? "Valor inválido." : "",
      !locationLabel && "Local do VMpay ausente.",
    ].filter(Boolean);
    pending.push({
      occurredAt: occurredAt ?? "", dateLabel, locationKey, locationLabel,
      productCode, productName, quantity: quantity ?? 0, value: value ?? 0,
      ...(issues.length ? { issue: issues.join(" ") } : {}), fingerprint: rowFingerprint,
    });
  }
  const occurrences = new Map<string, number>();
  const result: VmPaySaleRow[] = [];
  for (const row of pending) {
    const occurrence = occurrences.get(row.fingerprint) ?? 0;
    occurrences.set(row.fingerprint, occurrence + 1);
    const externalId = await fingerprint(row.fingerprint, occurrence);
    const { fingerprint: _fingerprint, ...sale } = row;
    result.push({ ...sale, externalId, receipt: `VMP-${externalId.slice(0, 24)}` });
  }
  return result;
}


