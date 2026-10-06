"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import type { FieldDefinition, RpgRecord } from "@/lib/api/contracts";
import type { RecordFieldDraft } from "@/lib/records/record-draft";
import { recordSchemaFingerprint } from "@/lib/records/record-draft";
import type { RecordFormState } from "@/app/actions/records";
import { FormAlert } from "@/app/components/forms/form-alert";
import { FocusFirstError } from "@/app/components/forms/focus-first-error";
import { useUnsavedChanges } from "@/app/components/forms/use-unsaved-changes";
type RecordAction = (previous: RecordFormState, formData: FormData) => Promise<RecordFormState>;
const initialState: RecordFormState = {};
export function RecordForm({ fields, action, record }: { fields: FieldDefinition[]; action: RecordAction; record?: RpgRecord }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const [draftFieldDefinitions] = useState(() => fields);
  const [draft, setDraft] = useState<Record<string, RecordFieldDraft>>(() => Object.fromEntries(fields.map((field) => [field.key, { included: field.required || (!!record && Object.hasOwn(record.values, field.key)), value: record?.values[field.key] ?? "" }])));
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  function change(key: string, value: Partial<RecordFieldDraft>) { setDirty(true); setDraft((current) => ({ ...current, [key]: { ...(current[key] ?? { included: false, value: "" }), ...value } })); }
  const currentFields = fields;
  const currentFieldKeys = new Set((state.currentFields ?? currentFields).map((field) => field.key));
  const removedDraftFields = draftFieldDefinitions.filter((field) => !currentFieldKeys.has(field.key) && draft[field.key]?.value);
  return <form action={formAction} className="flex max-w-3xl flex-col gap-5">
    <FocusFirstError errors={state.fieldErrors} />
    <FormAlert state={state} />
    {state.schemaChanged && state.currentFields && <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><h2 className="font-medium">Definição atual do template</h2><ul className="mt-2 list-inside list-disc text-sm">{state.currentFields.map((field) => <li key={field.key}>{field.label} <span className="font-mono text-xs text-muted-foreground">({field.key})</span></li>)}</ul><p className="mt-2 text-sm text-muted-foreground">Seu rascunho foi mantido. Atualize os campos atuais e revise os valores antes de salvar.</p>{removedDraftFields.length > 0 && <div className="mt-4 space-y-3"><h3 className="text-sm font-medium">Valores de campos removidos — copie-os antes de atualizar</h3>{removedDraftFields.map((field) => <div key={field.key} className="rounded-lg border border-border bg-background/60 p-3"><p className="text-sm font-medium">{field.label} <span className="font-mono text-xs text-muted-foreground">({field.key})</span></p><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words select-text text-sm">{draft[field.key]?.value}</pre></div>)}</div>}<Button type="button" variant="outline" className="mt-3" onClick={() => router.refresh()}>Atualizar definição</Button></section>}
    {fields.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Este template não possui campos. O registro será criado sem valores.</p>}
    {fields.map((field) => <div key={field.key} className="space-y-2">
      {!field.required && <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={draft[field.key]?.included ?? false} onChange={(event) => change(field.key, { included: event.target.checked })} className="accent-white" /> Incluir este campo</label>}
      {(field.required || draft[field.key]?.included) && <>{field.format === "text" ? <Input name={`field-${field.key}`} label={`${field.label}${field.required ? " (obrigatório)" : ""}`} value={draft[field.key]?.value ?? ""} maxLength={field.maxLength ?? 100000} onChange={(event) => change(field.key, { value: event.target.value })} error={state.fieldErrors?.[field.key]} hint={field.description} /> : <Textarea name={`field-${field.key}`} label={`${field.label}${field.required ? " (obrigatório)" : ""}`} value={draft[field.key]?.value ?? ""} maxLength={field.maxLength ?? 100000} onChange={(event) => change(field.key, { value: event.target.value })} error={state.fieldErrors?.[field.key]} hint={field.description} />}</>}
    </div>)}
    <input type="hidden" name="draft" value={JSON.stringify(draft)} /><input type="hidden" name="schemaFingerprint" value={recordSchemaFingerprint(currentFields)} />
    <Button type="submit" loading={pending} className="self-start">Salvar registro</Button>
  </form>;
}
