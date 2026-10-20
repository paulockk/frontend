import type { CatalogProduct } from "../types/operations";

export interface VmPayProductCandidate {
  sku: string;
  name: string;
  costPrice: number;
  salePrice: number;
  sourceRows: number;
  sourceLocations: string[];
  issue?: string;
}

export interface VmPayProductImportPreview {
  candidates: VmPayProductCandidate[];
  totalRows: number;
}

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .replace(/\s+/g, " ")
  .toLocaleLowerCase("pt-BR");

const normalizeHeader = (value: string) => normalize(value.replace(/[\uFEFF\u200B]/g, "")).replace(/[^a-z0-9]/g, "");

function parsePrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  const source = String(value ?? "").trim().replace(/R\$|\s/gi, "");
  if (!source) return null;
  const normalized = source.includes(",")
    ? source.replace(/\./g, "").replace(",", ".")
    : source;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function makeSku(name: string): string {
  const slug = normalize(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase().slice(0, 48) || "PRODUTO";
  let hash = 2166136261;
  for (const character of normalize(name)) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `VMP-${slug}-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function parseDelimited(text: string): string[][] {
  const sampleLines = text.split(/\r?\n/).slice(0, 20);
  const delimiter = sampleLines.reduce((best, line) => {
    const semicolons = line.match(/;/g)?.length ?? 0;
    const commas = line.match(/,/g)?.length ?? 0;
    return Math.max(semicolons, commas) > Math.max(best.semicolons, best.commas)
      ? { semicolons, commas }
      : best;
  }, { semicolons: 0, commas: 0 }).semicolons >= sampleLines.reduce((best, line) => Math.max(best, line.match(/,/g)?.length ?? 0), 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && character === delimiter) {
      row.push(cell); cell = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += character;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function parseVmPayCsvText(text: string): string[][] {
  return parseDelimited(text);
}

async function readZipEntries(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let endRecord = -1;
  for (let offset = Math.max(0, bytes.length - 65_557); offset <= bytes.length - 22; offset += 1) {
    if (view.getUint32(offset, true) === 0x06054b50) endRecord = offset;
  }
  if (endRecord < 0) throw new Error("O arquivo não é uma planilha XLSX válida.");
  const count = view.getUint16(endRecord + 10, true);
  let offset = view.getUint32(endRecord + 16, true);
  const entries = new Map<string, Uint8Array>();
  for (let entry = 0; entry < count; entry += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Não foi possível ler a estrutura da planilha.");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(start, start + compressedSize);
    if (name === "xl/sharedStrings.xml" || name === "xl/worksheets/sheet1.xml") {
      if (method === 0) entries.set(name, compressed);
      else if (method === 8) {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        entries.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
      } else throw new Error("A planilha usa um tipo de compactação não suportado.");
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (!entries.has("xl/worksheets/sheet1.xml")) throw new Error("Não encontrei a primeira aba da planilha.");
  return entries;
}

function rowsFromXml(entries: Map<string, Uint8Array>): string[][] {
  const parser = new DOMParser();
  const elements = (parent: ParentNode, localName: string) =>
    [...(parent as Document | Element).getElementsByTagName("*")].filter((element) => element.localName === localName);
  const sharedXml = entries.get("xl/sharedStrings.xml");
  const sharedStrings = sharedXml
    ? elements(parser.parseFromString(new TextDecoder().decode(sharedXml), "application/xml"), "si")
      .map((item) => item.textContent ?? "")
    : [];
  const xml = parser.parseFromString(new TextDecoder().decode(entries.get("xl/worksheets/sheet1.xml")), "application/xml");
  if (elements(xml, "parsererror").length) throw new Error("Não foi possível interpretar o conteúdo da planilha.");
  const sheetData = elements(xml, "sheetData")[0];
  if (!sheetData) throw new Error("A planilha está sem linhas de dados.");
  return [...sheetData.children].filter((element) => element.localName === "row").map((xmlRow) => {
    const cells: string[] = [];
    for (const cell of [...xmlRow.children].filter((element) => element.localName === "c")) {
      const reference = cell.getAttribute("r") ?? "A1";
      const column = reference.match(/[A-Z]+/i)?.[0] ?? "A";
      const columnIndex = [...column.toUpperCase()].reduce((value, character) => value * 26 + character.charCodeAt(0) - 64, 0) - 1;
      const descendants = elements(cell, "v");
      const inlineText = elements(cell, "is")[0]?.textContent;
      const value = descendants[0]?.textContent ?? inlineText ?? "";
      cells[columnIndex] = cell.getAttribute("t") === "s" ? sharedStrings[Number(value)] ?? "" : value;
    }
    return cells;
  });
}

function candidatesFromRows(rows: unknown[][]): VmPayProductImportPreview {
  const costPriceHeaders = ["precocusto", "precodecusto"];
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map((value) => normalizeHeader(String(value ?? "")));
    return headers.includes("produto") && headers.includes("precodesejado") && costPriceHeaders.some((name) => headers.includes(name));
  });
  if (headerIndex < 0) {
    throw new Error("Não encontrei as colunas Produto, Preço desejado e Preço de custo. Envie a exportação de itens do VMpay, não o relatório de vendas.");
  }
  const headers = rows[headerIndex]!.map((value) => normalizeHeader(String(value ?? "")));
  const nameIndex = headers.indexOf("produto");
  const locationIndex = headers.indexOf("local");
  const saleIndex = headers.indexOf("precodesejado");
  const costIndex = headers.findIndex((header) => costPriceHeaders.includes(header));
  const grouped = new Map<string, { name: string; costPrice: number; salePrice: number; sourceRows: number; sourceLocations: string[]; issue?: string }>();
  let totalRows = 0;
  for (const row of rows.slice(headerIndex + 1)) {
    const name = String(row[nameIndex] ?? "").trim();
    if (!name) continue;
    totalRows += 1;
    const costPrice = parsePrice(row[costIndex]);
    const salePrice = parsePrice(row[saleIndex]);
    const sourceLocation = String(row[locationIndex] ?? "").trim();
    const key = normalize(name);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        name,
        costPrice: costPrice ?? 0,
        salePrice: salePrice ?? 0,
        sourceRows: 1,
        sourceLocations: sourceLocation ? [sourceLocation] : [],
        ...((costPrice === null || salePrice === null) ? { issue: "Preço de custo ou preço de venda ausente/inválido." } : {}),
      });
      continue;
    }
    existing.sourceRows += 1;
    if (sourceLocation && !existing.sourceLocations.includes(sourceLocation)) existing.sourceLocations.push(sourceLocation);
    if (costPrice === null || salePrice === null) existing.issue = "Há uma linha sem preço válido para este produto.";
    else if (existing.costPrice !== costPrice || existing.salePrice !== salePrice) existing.issue = "O arquivo tem preços diferentes para o mesmo produto; revise antes de importar.";
  }
  return {
    totalRows,
    candidates: [...grouped.values()].map((item) => ({ ...item, sku: makeSku(item.name) })),
  };
}

export async function readVmPayTabularFile(file: File): Promise<unknown[][]> {
  const buffer = await file.arrayBuffer();
  const signature = new Uint8Array(buffer.slice(0, 4));
  const isZip = signature[0] === 0x50 && signature[1] === 0x4b;
  if (isZip) return rowsFromXml(await readZipEntries(buffer));
  if (file.name.toLocaleLowerCase().endsWith(".csv") || (signature[0] === 0xef && signature[1] === 0xbb && signature[2] === 0xbf)) {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      text = new TextDecoder("windows-1252").decode(buffer);
    }
    return parseDelimited(text);
  }
  throw new Error("Formato não reconhecido. Envie uma planilha XLSX ou um CSV do VMpay.");
}

export async function parseVmPayProductFile(file: File): Promise<VmPayProductImportPreview> {
  return candidatesFromRows(await readVmPayTabularFile(file));
}

export function findExistingProduct(candidate: VmPayProductCandidate, products: CatalogProduct[]): CatalogProduct | undefined {
  const candidateName = normalize(candidate.name);
  return products.find((product) => product.sku.toLocaleUpperCase() === candidate.sku
    || normalize(product.name) === candidateName);
}
