"use client";
import { useActionState, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { FieldEditor, type FieldDraft } from "@/app/components/templates/field-editor";
import type { FieldDefinitionInput } from "@/lib/api/contracts";
import type { FormState } from "@/lib/forms/state";
import { FormAlert } from "@/app/components/forms/form-alert";
import { FocusFirstError } from "@/app/components/forms/focus-first-error";
import { useUnsavedChanges } from "@/app/components/forms/use-unsaved-changes";

type TemplateAction = (previous: FormState, formData: FormData) => Promise<FormState>;
type TemplateFormProps = { action: TemplateAction; mode: "create" | "edit"; initial?: { name: string; identifier: string; description?: string; category?: string; fields: FieldDefinitionInput[] } };
const initialState: FormState = {};
function payloadFields(fields: FieldDraft[]): FieldDefinitionInput[] {
  return fields.map((field) => ({ key: field.key, label: field.label, ...(field.description ? { description: field.description } : {}), ...(field.required === undefined ? {} : { required: field.required }), ...(field.maxLengthText === "" ? {} : { maxLength: Number(field.maxLengthText) }), ...(field.format ? { format: field.format } : {}) }));
}
export function TemplateForm({ action, mode, initial }: TemplateFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  const initialSerialized = JSON.stringify(initial?.fields ?? []);
  const fieldsChanged = mode === "create" || (fieldsDirty && JSON.stringify(payloadFields(fields)) !== initialSerialized);
  const serialized = JSON.stringify(payloadFields(fields));
  return <form action={formAction} onChange={() => setDirty(true)} className="flex max-w-3xl flex-col gap-5">
    <FocusFirstError errors={state.fieldErrors} />
    <FormAlert state={state} />
    {state.message?.startsWith("A alteração é incompatível") && <Button type="button" variant="outline" className="self-start" onClick={() => window.location.reload()}>Recarregar versão salva</Button>}
    <Input name="name" label="Nome" required maxLength={100} defaultValue={initial?.name} error={state.fieldErrors?.name} />
    <Input name="identifier" label="Identificador" required maxLength={64} defaultValue={initial?.identifier} error={state.fieldErrors?.identifier} hint="Comece com uma letra minúscula. Use letras minúsculas, números, _ ou -." />
    <Input name="category" label="Categoria (opcional)" maxLength={64} defaultValue={initial?.category} error={state.fieldErrors?.category} />
    <Textarea name="description" label="Descrição (opcional)" maxLength={5000} defaultValue={initial?.description} error={state.fieldErrors?.description} />
    <FieldEditor initialFields={initial?.fields ?? []} onChange={(value) => { setFields(value); setFieldsDirty(true); setDirty(true); }} errors={state.fieldErrors} pending={pending} />
    <p className="text-xs text-muted-foreground">Definição atual: {new TextEncoder().encode(serialized).byteLength} bytes de JSON.</p>
    {fieldsChanged && <input type="hidden" name="fields" value={serialized} />}
    <Button type="submit" loading={pending} className="self-start">{mode === "create" ? "Criar template" : "Salvar alterações"}</Button>
  </form>;
}
