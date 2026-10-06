"use client";
import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions/account";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import type { FormState } from "@/lib/forms/state";
import { FormAlert } from "@/app/components/forms/form-alert";
import { FocusFirstError } from "@/app/components/forms/focus-first-error";

const initialState: FormState = {};
export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccount, initialState);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  return <div className="mt-5">
    {!confirmationOpen ? <Button type="button" variant="outline" onClick={() => setConfirmationOpen(true)}>Excluir minha conta</Button> : <form action={formAction} className="flex max-w-lg flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <FocusFirstError errors={state.fieldErrors} />
      <p className="text-sm text-muted-foreground">Excluir sua conta remove todos os seus sistemas, coleções, templates e registros. Esta ação não pode ser desfeita.</p>
      <FormAlert state={state} />
      <Input type="password" name="password" label="Senha atual" autoComplete="current-password" required minLength={8} maxLength={1024} error={state.fieldErrors?.password} />
      <label className="flex items-start gap-3 text-sm"><input name="confirmed" type="checkbox" value="yes" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required className="mt-1 accent-white" /> <span>Quero excluir minha conta</span></label>
      {state.fieldErrors?.confirmed && <p role="alert" className="text-sm text-destructive">{state.fieldErrors.confirmed}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" variant="primary" disabled={pending || !confirmed} loading={pending}>Confirmar exclusão</Button><Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmationOpen(false)}>Cancelar</Button></div>
    </form>}
  </div>;
}
