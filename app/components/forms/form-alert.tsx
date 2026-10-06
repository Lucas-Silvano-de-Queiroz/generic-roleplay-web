import type { FormState } from "@/lib/forms/state";
export function FormAlert({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><p>{state.message}</p>{state.retryAfterSeconds !== undefined && <p className="mt-1">Tente novamente em pelo menos {state.retryAfterSeconds} segundos.</p>}{state.requestId && <p className="mt-1 text-xs">Referência: {state.requestId}</p>}</div>;
}
