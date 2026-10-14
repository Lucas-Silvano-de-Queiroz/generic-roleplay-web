import { expect, it } from "vitest";
import { decodeRecord, decodeRecordPage, decodeSystemList, decodeTemplate } from "@/lib/api/contracts";
import { record, template } from "../support/fixtures";

it("decodifica RecordPage e mantém datas e texto literais", () => {
  expect(decodeRecordPage({ items: [record], nextCursor: record.id })).toEqual({ items: [record], nextCursor: record.id });
  expect(decodeTemplate(template)).toEqual(template);
});
it("rejeita confusão entre listas, página e DTOs inválidos", () => {
  expect(() => decodeRecordPage([record])).toThrow();
  expect(() => decodeSystemList({ items: [] })).toThrow();
  expect(() => decodeRecord({ ...record, id: "inválido" })).toThrow();
  expect(() => decodeRecord({ ...record, createdAt: "ontem" })).toThrow();
  expect(() => decodeRecord({ ...record, values: { name: 1 } })).toThrow();
});
