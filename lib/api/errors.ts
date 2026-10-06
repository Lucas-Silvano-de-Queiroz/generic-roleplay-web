import type { FormState } from "@/lib/forms/state";

export type ApiFailure = {
  kind: "http" | "network" | "timeout" | "invalid-response";
  statusCode?: number;
  message: string;
  details?: Array<{ field: string; message: string }>;
  retryAfterSeconds?: number;
  requestId?: string;
};
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };
export type ApiRequestOptions<T> = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  auth: "public" | "session" | "refresh-session";
  body?: unknown;
  parseResponse?: (value: unknown) => T;
};

export function mapApiError(error: ApiFailure): FormState {
  if (error.statusCode === 401) return { message: "Sua sessão expirou. Entre novamente." };
  if (error.statusCode === 404) return { message: "Recurso não encontrado." };
  if (error.statusCode === 409) {
    const message = error.message;
    if (message === "User already exists") return { fieldErrors: { email: "Este e-mail já está cadastrado." } };
    if (message === "Collection identifier already exists" || message === "Template identifier already exists") return { fieldErrors: { identifier: "Este identificador já está em uso." } };
    if (message === "Collection limit reached") return { message: "Este sistema já atingiu o limite de 100 coleções." };
    if (message === "Template limit reached") return { message: "Esta coleção já atingiu o limite de 100 templates." };
    if (message === "Record limit reached") return { message: "Este template já atingiu o limite de 1000 registros." };
    if (message === "Template change would invalidate existing records") return { message: "A alteração é incompatível com registros existentes. Revise os registros ou recarregue a definição salva." };
    return { message: "Houve um conflito ao salvar. Revise os dados e tente novamente." };
  }
  if (error.statusCode === 413) return { message: "O conteúdo excede o tamanho permitido. Reduza os textos para continuar." };
  if (error.statusCode === 429) return { message: "Muitas tentativas. Aguarde antes de tentar novamente.", retryAfterSeconds: error.retryAfterSeconds, requestId: error.requestId };
  if (error.statusCode === 400 && error.details?.length) {
    const fieldErrors: Record<string, string> = {};
    for (const detail of error.details) fieldErrors[detail.field || "form"] = detail.message;
    return { fieldErrors, ...(fieldErrors.form ? { message: fieldErrors.form } : {}) };
  }
  return { message: "Não foi possível concluir a operação. Seus dados foram mantidos; tente novamente." , requestId: error.requestId };
}
