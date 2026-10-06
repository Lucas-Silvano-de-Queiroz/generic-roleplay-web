import type { ValidationResult } from "@/lib/forms/state";

type RegisterInput = { name: string; email: string; password: string };
type LoginInput = { email: string; password: string };
type DeletePasswordInput = { password: string };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function objectInput(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input) ? input as Record<string, unknown> : {};
}
function stringField(input: Record<string, unknown>, field: string): string | undefined {
  return typeof input[field] === "string" ? input[field] as string : undefined;
}

export function validateRegister(input: unknown): ValidationResult<RegisterInput> {
  const source = objectInput(input);
  const name = stringField(source, "name") ?? "";
  const emailInput = stringField(source, "email") ?? "";
  const password = stringField(source, "password") ?? "";
  const email = emailInput.trim().toLowerCase();
  const fieldErrors: Record<string, string> = {};
  if (name.length > 1024 || Array.from(name.trim()).length < 1 || Array.from(name.trim()).length > 255) fieldErrors.name = "Informe um nome com até 255 caracteres.";
  if (emailInput.length > 512 || !EMAIL_PATTERN.test(email) || email.length > 255) fieldErrors.email = "Informe um e-mail válido com até 255 caracteres.";
  if (password.length < 8 || password.length > 1024) fieldErrors.password = "A senha deve ter entre 8 e 1024 caracteres.";
  return Object.keys(fieldErrors).length ? { valid: false, fieldErrors } : { valid: true, data: { name: name.trim(), email, password } };
}
export function validateLogin(input: unknown): ValidationResult<LoginInput> {
  const source = objectInput(input);
  const emailInput = stringField(source, "email") ?? "";
  const password = stringField(source, "password") ?? "";
  const email = emailInput.trim().toLowerCase();
  const fieldErrors: Record<string, string> = {};
  if (emailInput.length > 512 || !EMAIL_PATTERN.test(email) || email.length > 255) fieldErrors.email = "Informe um e-mail válido.";
  if (password.length < 1 || password.length > 1024) fieldErrors.password = "Informe sua senha.";
  return Object.keys(fieldErrors).length ? { valid: false, fieldErrors } : { valid: true, data: { email, password } };
}
export function validateDeletePassword(input: unknown): ValidationResult<DeletePasswordInput> {
  const password = stringField(objectInput(input), "password") ?? "";
  if (password.length < 8 || password.length > 1024) return { valid: false, fieldErrors: { password: "Informe uma senha entre 8 e 1024 caracteres." } };
  return { valid: true, data: { password } };
}
