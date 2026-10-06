"use client";
import { useId, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import type { FieldDefinitionInput } from "@/lib/api/contracts";

export type FieldDraft = FieldDefinitionInput & { rowId: string; savedKey?: string; maxLengthText: string };
export function makeFieldDrafts(fields: readonly FieldDefinitionInput[] = []): FieldDraft[] {
  return fields.map((field) => ({ ...field, savedKey: field.key, rowId: crypto.randomUUID(), maxLengthText: field.maxLength === undefined ? "" : String(field.maxLength) }));
}
type FieldEditorProps = { initialFields: readonly FieldDefinitionInput[]; onChange: (fields: FieldDraft[]) => void; errors?: Record<string, string>; pending: boolean };
export function FieldEditor({ initialFields, onChange, errors = {}, pending }: FieldEditorProps) {
  const [rows, setRows] = useState(() => makeFieldDrafts(initialFields));
  const idPrefix = useId();
  function update(rowId: string, field: keyof FieldDraft, value: string | boolean) {
    const next = rows.map((row) => row.rowId === rowId ? { ...row, [field]: value, ...(field === "maxLengthText" && typeof value === "string" ? { maxLength: value === "" ? undefined : Number(value) } : {}) } : row);
    setRows(next); onChange(next);
  }
  function move(index: number, offset: -1 | 1) {
    if (pending) return;
    const target = index + offset;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows]; [next[index], next[target]] = [next[target], next[index]]; setRows(next); onChange(next);
  }
  function remove(rowId: string) {
    if (!window.confirm("Remover esta definição? Os registros existentes podem impedir a alteração do template.")) return;
    const next = rows.filter((row) => row.rowId !== rowId); setRows(next); onChange(next);
  }
  function add() {
    if (rows.length >= 100) return;
    const next = [...rows, { rowId: crypto.randomUUID(), key: "", label: "", required: false, format: "text" as const, maxLengthText: "" }]; setRows(next); onChange(next);
  }
  return <section className="space-y-4" aria-labelledby={`${idPrefix}-fields-heading`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id={`${idPrefix}-fields-heading`} className="text-lg font-medium">Campos</h2><p className="text-xs text-muted-foreground">{rows.length}/100 campos</p></div><Button type="button" size="sm" variant="outline" onClick={add} disabled={pending || rows.length >= 100}>Adicionar campo</Button></div>
    {rows.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Este template ainda não possui campos.</p> : rows.map((row, index) => {
      const prefix = `fields.${index}`;
      return <fieldset key={row.rowId} disabled={pending} className="grid gap-4 rounded-xl border border-border/70 bg-card/60 p-4 sm:grid-cols-2">
        <legend className="sr-only">Campo {index + 1}</legend>
        <div><Input name={`${prefix}.key`} label="Chave técnica" value={row.key} maxLength={64} onChange={(event) => update(row.rowId, "key", event.target.value)} error={errors[`${prefix}.key`]} />{row.savedKey && row.key !== row.savedKey && <p className="mt-1 text-xs text-amber-300">Mudar a chave altera a estrutura e pode afetar os registros existentes.</p>}</div>
        <Input name={`${prefix}.label`} label="Rótulo" value={row.label} maxLength={100} onChange={(event) => update(row.rowId, "label", event.target.value)} error={errors[`${prefix}.label`]} />
        <Textarea name={`${prefix}.description`} label="Ajuda (opcional)" value={row.description ?? ""} maxLength={1000} onChange={(event) => update(row.rowId, "description", event.target.value)} error={errors[`${prefix}.description`]} className="min-h-20" />
        <div className="space-y-4"><Input name={`${prefix}.maxLength`} label="Limite de texto" type="number" min={1} max={100000} step={1} value={row.maxLengthText} onChange={(event) => update(row.rowId, "maxLengthText", event.target.value)} error={errors[`${prefix}.maxLength`]} />
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={row.required ?? false} onChange={(event) => update(row.rowId, "required", event.target.checked)} className="accent-white" /> Obrigatório</label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-muted-foreground">Apresentação<select value={row.format ?? "text"} onChange={(event) => update(row.rowId, "format", event.target.value)} className="h-11 rounded-xl border border-input bg-muted/40 px-3 text-foreground"><option value="text">Texto</option><option value="textarea">Texto longo</option></select></label>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="button" size="sm" variant="ghost" disabled={pending || index === 0} onClick={() => move(index, -1)}>Mover para cima</Button><Button type="button" size="sm" variant="ghost" disabled={pending || index === rows.length - 1} onClick={() => move(index, 1)}>Mover para baixo</Button><Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => remove(row.rowId)}>Remover</Button></div>
      </fieldset>;
    })}
  </section>;
}
