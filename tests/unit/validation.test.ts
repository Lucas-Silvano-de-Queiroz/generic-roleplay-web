import { describe, expect, it } from "vitest";
import { validateRegister, validateLogin, validateDeletePassword } from "@/lib/validation/identity";
import { validateCreateSystem, validateCreateCollection, validateCreateTemplate, validateUpdateTemplate } from "@/lib/validation/content";
import { validateRecordValues } from "@/lib/validation/records";
import { buildRecordValues } from "@/lib/records/record-draft";
import { fields } from "../support/fixtures";

describe("limites de entrada", () => {
  it.each([[7, false], [8, true], [1024, true], [1025, false]])("cadastro e exclusão: senha de %i", (length, valid) => {
    expect(validateRegister({ name: "Pessoa", email: "a@example.com", password: "x".repeat(length) }).valid).toBe(valid);
    expect(validateDeletePassword({ password: "x".repeat(length) }).valid).toBe(valid);
  });
  it.each([[0, false], [1, true], [1024, true], [1025, false]])("login: senha de %i", (length, valid) => {
    expect(validateLogin({ email: "a@example.com", password: "x".repeat(length) }).valid).toBe(valid);
  });
  it("conta pontos de código no nome e normaliza o e-mail sem alterar senha", () => {
    expect(validateRegister({ name: "😀".repeat(255), email: " A@EXAMPLE.COM ", password: " 12345678 " })).toEqual({ valid: true, data: { name: "😀".repeat(255), email: "a@example.com", password: " 12345678 " } });
    expect(validateRegister({ name: "😀".repeat(256), email: "a@example.com", password: "12345678" }).valid).toBe(false);
    expect(validateRegister({ name: " ".repeat(1024) + "a", email: "a@example.com", password: "12345678" }).valid).toBe(false);
  });
  it.each([[100, true], [101, false]])("nome de conteúdo bruto de %i", (length, valid) => {
    expect(validateCreateSystem({ name: "x".repeat(length) }).valid).toBe(valid);
  });
  it.each(["Capital", "1abc", "__proto__", "a b", "a".repeat(65)])("rejeita identifier inválido %s", (identifier) => {
    expect(validateCreateCollection({ name: "Coleção", identifier }).valid).toBe(false);
  });
  it("aceita identifier de 64 caracteres", () => {
    expect(validateCreateCollection({ name: "Coleção", identifier: "a".repeat(64) }).valid).toBe(true);
  });
});

describe("templates e PATCH", () => {
  it.each([null, [], "texto", 3])("rejeita corpo PATCH que não é objeto: %j", (input) => {
    expect(validateUpdateTemplate(input).valid).toBe(false);
  });
  it("permite omitir fields na criação usando o default vazio", () => {
    expect(validateCreateTemplate({ name: "Ficha", identifier: "sheet" })).toEqual({ valid: true, data: { name: "Ficha", identifier: "sheet", fields: [] } });
  });
  it("PATCH de metadados preserva fields omitidos", () => {
    expect(validateUpdateTemplate({ name: "Novo" })).toEqual({ valid: true, data: { name: "Novo" } });
  });
  it("rejeita propriedades extras e null sem apagar a descrição", () => {
    expect(validateUpdateTemplate({ description: null }).valid).toBe(false);
    expect(validateUpdateTemplate({ ownerId: "x" }).valid).toBe(false);
    expect(validateUpdateTemplate({ description: "" })).toEqual({ valid: true, data: { description: "" } });
  });
  it.each([[100, true], [101, false]])("limite de %i campos", (length, valid) => {
    expect(validateCreateTemplate({ name: "Ficha", identifier: "sheet", fields: Array.from({ length }, (_, i) => ({ key: `field_${i}`, label: "Campo" })) }).valid).toBe(valid);
  });
  it.each([0, 1.5, 100001])("rejeita maxLength %i", (maxLength) => {
    expect(validateUpdateTemplate({ fields: [{ key: "a", label: "A", maxLength }] }).valid).toBe(false);
  });
  it("rejeita keys repetidas e formato desconhecido", () => {
    expect(validateUpdateTemplate({ fields: [{ key: "a", label: "A" }, { key: "a", label: "B" }] }).valid).toBe(false);
    expect(validateUpdateTemplate({ fields: [{ key: "a", label: "A", format: "html" }] }).valid).toBe(false);
  });
});

describe("valores literais", () => {
  it("preserva todos os valores incluídos e distingue ausente de vazio", () => {
    expect(buildRecordValues(fields, { name: { included: true, value: "  Amizade  " }, notes: { included: true, value: "Material: visco\n\n✨" } })).toEqual({ valid: true, data: { name: "  Amizade  ", notes: "Material: visco\n\n✨" } });
    expect(buildRecordValues(fields, { name: { included: true, value: "Nome" }, notes: { included: false, value: "antigo" } })).toEqual({ valid: true, data: { name: "Nome" } });
    expect(buildRecordValues(fields, { name: { included: true, value: "Nome" }, notes: { included: true, value: "" } })).toEqual({ valid: true, data: { name: "Nome", notes: "" } });
  });
  it("rejeita required com espaços, keys desconhecidas e comprimento UTF-16", () => {
    expect(validateRecordValues({ name: "  " }, fields).valid).toBe(false);
    expect(validateRecordValues({ name: "Nome", unknown: "x" }, fields).valid).toBe(false);
    expect(validateRecordValues({ name: "😀" }, [{ ...fields[0], maxLength: 1 }]).valid).toBe(false);
  });
  it("aceita template vazio e keys próprias constructor/prototype", () => {
    expect(buildRecordValues([], {})).toEqual({ valid: true, data: {} });
    const special = ["constructor", "prototype"].map((key) => ({ key, label: key, required: false, format: "text" as const }));
    expect(validateRecordValues({ constructor: "literal", prototype: "<script>texto</script>" }, special)).toEqual({ valid: true, data: { constructor: "literal", prototype: "<script>texto</script>" } });
  });
  it("rejeita valores de rascunho que não são texto", () => {
    expect(buildRecordValues(fields, JSON.parse('{"name":{"included":true,"value":42}}')).valid).toBe(false);
  });
});
