"use client";
import { useActionState, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import type { FormState } from "@/lib/forms/state";
import { FormAlert } from "@/app/components/forms/form-alert";
import { FocusFirstError } from "@/app/components/forms/focus-first-error";
import { useUnsavedChanges } from "@/app/components/forms/use-unsaved-changes";

type EntityFormProps = {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  initial?: { name?: string; description?: string; identifier?: string; category?: string };
  mode: "create" | "edit";
  kind: "system" | "collection" | "template";
};
const initialState: FormState = {};
export function EntityForm({ action, initial = {}, mode, kind }: EntityFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  const entityName = kind === "system" ? "sistema" : kind === "collection" ? "coleção" : "template";
  return <form action={formAction} onChange={() => setDirty(true)} className="flex max-w-2xl flex-col gap-5">
    <FocusFirstError errors={state.fieldErrors} />
    <FormAlert state={state} />
    <Input name="name" label="Nome" required maxLength={100} defaultValue={initial.name} error={state.fieldErrors?.name} />
    {kind !== "system" && <Input name="identifier" label="Identificador" required maxLength={64} defaultValue={initial.identifier} hint="Comece com uma letra minúscula. Use letras minúsculas, números, _ ou -." error={state.fieldErrors?.identifier} />}
    {kind === "template" && <Input name="category" label="Categoria (opcional)" maxLength={64} defaultValue={initial.category} error={state.fieldErrors?.category} />}
    <Textarea name="description" label="Descrição (opcional)" maxLength={5000} defaultValue={initial.description} error={state.fieldErrors?.description} />
    {kind === "template" && mode === "create" && <input type="hidden" name="fields" value="[]" />}
    {state.fieldErrors?.form && <p role="alert" className="text-sm text-destructive">{state.fieldErrors.form}</p>}
    <Button type="submit" loading={pending} className="self-start">{mode === "create" ? `Criar ${entityName}` : "Salvar alterações"}</Button>
  </form>;
}
