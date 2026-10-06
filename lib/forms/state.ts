export type FormState = {
  fieldErrors?: Record<string, string>;
  message?: string;
  retryAfterSeconds?: number;
  requestId?: string;
};

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; fieldErrors: Record<string, string> };

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
