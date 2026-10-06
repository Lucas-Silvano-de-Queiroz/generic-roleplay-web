import type { FormState } from "@/lib/forms/state";
export type RegisterFieldErrors = NonNullable<FormState["fieldErrors"]> & { confirmPassword?: string };
export type RegisterState = FormState & { errors?: RegisterFieldErrors; fieldErrors?: RegisterFieldErrors };
export type LoginFieldErrors = FormState["fieldErrors"];
export type LoginState = FormState & { errors?: LoginFieldErrors; fieldErrors?: LoginFieldErrors };
