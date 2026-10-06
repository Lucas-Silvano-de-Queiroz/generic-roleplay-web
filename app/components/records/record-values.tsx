import type { FieldDefinition, RpgRecord } from "@/lib/api/contracts";
export function RecordValues({ fields, record }: { fields: FieldDefinition[]; record: RpgRecord }) {
  return <dl className="space-y-4">{fields.map((field) => {
    const present = Object.hasOwn(record.values, field.key);
    return <div key={field.key} className="rounded-xl border border-border/70 bg-card p-4"><dt className="font-medium">{field.label}</dt>{field.description && <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>}<dd className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{present ? (record.values[field.key] === "" ? "Vazio" : record.values[field.key]) : "Não preenchido"}</dd></div>;
  })}</dl>;
}
