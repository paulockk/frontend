import { readVmPayTabularFile } from "./vmpay-import.service";

export interface VmPayPicklistLine {
  picklistId: string;
  applicationDate: string;
  client: string;
  local: string;
  machine: string;
  channel: string;
  productName: string;
  quantity: number;
  noteKey: string;
}

export interface VmPayPicklistPreview {
  state: string;
  lines: VmPayPicklistLine[];
}

const normalizeHeader = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");
const normalizeKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

function parseQuantity(value: unknown): number | null {
  const source = String(value ?? "").trim().replace(/\s/g, "");
  if (!source) return null;
  const normalized = source.includes(",") ? source.replace(/\./g, "").replace(",", ".") : source;
  const quantity = Number(normalized);
  return Number.isFinite(quantity) && quantity > 0 && Number.isInteger(quantity) ? quantity : null;
}

export async function parseVmPayPicklistFile(file: File): Promise<VmPayPicklistPreview> {
  const rows = await readVmPayTabularFile(file);
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map((value) => normalizeHeader(String(value ?? "")));
    return ["picklist", "datadeaplicacao", "cliente", "local", "maquina", "canaleta", "produto", "quantidade"]
      .every((name) => headers.includes(name));
  });
  if (headerIndex < 0) throw new Error("Não encontrei o relatório de picklists aplicados do VMpay.");

  const metadata = new Map<string, string>();
  for (const row of rows.slice(0, headerIndex)) {
    const key = normalizeHeader(String(row[0] ?? ""));
    const value = String(row[1] ?? "").trim();
    if (key && value) metadata.set(key, value);
  }
  const headers = rows[headerIndex]!.map((value) => normalizeHeader(String(value ?? "")));
  const index = (name: string) => headers.indexOf(name);
  const lines: VmPayPicklistLine[] = [];
  for (const [offset, row] of rows.slice(headerIndex + 1).entries()) {
    const productName = String(row[index("produto")] ?? "").trim();
    if (!productName) continue;
    const picklistId = String(row[index("picklist")] ?? "").trim().replace(/\D/g, "");
    const applicationDate = String(row[index("datadeaplicacao")] ?? "").trim();
    const client = String(row[index("cliente")] ?? "").trim();
    const local = String(row[index("local")] ?? "").trim();
    const machine = String(row[index("maquina")] ?? "").trim();
    const channel = String(row[index("canaleta")] ?? "").trim();
    const quantity = parseQuantity(row[index("quantidade")]);
    if (!picklistId || !machine || !channel || quantity === null) {
      throw new Error(`A linha ${headerIndex + offset + 2} tem picklist, máquina, canaleta ou quantidade inválida.`);
    }
    const identity = [picklistId, normalizeKey(machine), normalizeKey(channel)].join(":");
    lines.push({ picklistId, applicationDate, client, local, machine, channel, productName, quantity, noteKey: `VMPAY_PICKLIST:${identity}` });
  }
  if (!lines.length) throw new Error("O relatório não contém itens de picklists.");
  return { state: metadata.get("estado") ?? "", lines };
}
