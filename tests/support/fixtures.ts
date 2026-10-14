import type { FieldDefinition, RpgRecord, RpgTemplate } from "@/lib/api/contracts";

export const id = "019a0000-0000-7000-8000-000000000001";
export const otherId = "019a0000-0000-7000-8000-000000000002";
export const timestamp = "2026-10-05T12:00:00.000Z";
export const fields: FieldDefinition[] = [
  { key: "name", label: "Nome", required: true, format: "text" },
  { key: "notes", label: "Notas", required: false, format: "textarea" },
];
export const template: RpgTemplate = { id, collectionId: otherId, name: "Ficha", identifier: "sheet", fields, createdAt: timestamp, updatedAt: timestamp };
export const record: RpgRecord = { id, templateId: id, values: { name: "  Amizade  ", notes: "Material: visco\n\n✨" }, createdAt: timestamp, updatedAt: timestamp };
export function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
export function token(expiry: number): string {
  return `header.${Buffer.from(JSON.stringify({ exp: expiry / 1000 })).toString("base64url")}.signature`;
}
