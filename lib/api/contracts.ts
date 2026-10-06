export type UUID = string;
export type IsoDate = string;

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
};
export type ApiErrorBody = {
  statusCode: number;
  message: string;
  details?: Array<{ field: string; message: string }>;
};
export type RpgSystem = {
  id: UUID;
  name: string;
  description?: string;
  createdAt: IsoDate;
  updatedAt: IsoDate;
};
export type RpgCollection = RpgSystem & { systemId: UUID; identifier: string };
export type FieldDefinition = {
  key: string;
  label: string;
  description?: string;
  required: boolean;
  maxLength?: number;
  format: "text" | "textarea";
};
export type FieldDefinitionInput = Omit<FieldDefinition, "required" | "format"> & {
  required?: boolean;
  format?: FieldDefinition["format"];
};
export type RpgTemplate = RpgSystem & {
  collectionId: UUID;
  identifier: string;
  category?: string;
  fields: FieldDefinition[];
};
export type RecordValues = Record<string, string>;
export type RpgRecord = {
  id: UUID;
  templateId: UUID;
  values: RecordValues;
  createdAt: IsoDate;
  updatedAt: IsoDate;
};
export type RecordPage = { items: RpgRecord[]; nextCursor?: UUID };
export type CreateSystem = { name: string; description?: string };
export type UpdateSystem = Partial<CreateSystem>;
export type CreateCollection = CreateSystem & { identifier: string };
export type UpdateCollection = Partial<CreateCollection>;
export type CreateTemplate = CreateCollection & { category?: string; fields?: FieldDefinitionInput[] };
export type UpdateTemplate = Partial<CreateTemplate>;
export type CreateRecord = { values: RecordValues };
export type UpdateRecord = Partial<CreateRecord>;
export type ListRecordsQuery = { limit?: number; cursor?: UUID };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isUuid(value: unknown): value is UUID {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function objectValue(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as Record<string, unknown>;
}
function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  return value;
}
function uuid(value: unknown, field: string): UUID {
  if (!isUuid(value)) throw new Error(`${field} must be a UUID`);
  return value;
}
function isoDate(value: unknown, field: string): IsoDate {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`${field} must be an ISO date`);
  return value;
}
function decodeBase(value: unknown) {
  const source = objectValue(value, "Entity");
  return {
    id: uuid(source.id, "id"),
    name: requiredString(source.name, "name"),
    ...(source.description === undefined ? {} : { description: requiredString(source.description, "description") }),
    createdAt: isoDate(source.createdAt, "createdAt"),
    updatedAt: isoDate(source.updatedAt, "updatedAt"),
  };
}
function decodeField(value: unknown): FieldDefinition {
  const source = objectValue(value, "Field definition");
  if (typeof source.required !== "boolean") throw new Error("required must be a boolean");
  if (source.format !== "text" && source.format !== "textarea") throw new Error("format is invalid");
  if (source.maxLength !== undefined && (!Number.isInteger(source.maxLength) || Number(source.maxLength) < 1 || Number(source.maxLength) > 100000)) throw new Error("maxLength is invalid");
  return {
    key: requiredString(source.key, "key"),
    label: requiredString(source.label, "label"),
    ...(source.description === undefined ? {} : { description: requiredString(source.description, "description") }),
    required: source.required,
    ...(source.maxLength === undefined ? {} : { maxLength: source.maxLength as number }),
    format: source.format,
  };
}

export function decodeUserCreated(value: unknown): { id: UUID } {
  return { id: uuid(objectValue(value, "User").id, "id") };
}
export function decodeSystem(value: unknown): RpgSystem { return decodeBase(value); }
export function decodeCollection(value: unknown): RpgCollection {
  const source = objectValue(value, "Collection");
  return { ...decodeBase(value), systemId: uuid(source.systemId, "systemId"), identifier: requiredString(source.identifier, "identifier") };
}
export function decodeTemplate(value: unknown): RpgTemplate {
  const source = objectValue(value, "Template");
  if (!Array.isArray(source.fields)) throw new Error("fields must be an array");
  return {
    ...decodeBase(value), collectionId: uuid(source.collectionId, "collectionId"),
    identifier: requiredString(source.identifier, "identifier"),
    ...(source.category === undefined ? {} : { category: requiredString(source.category, "category") }),
    fields: source.fields.map(decodeField),
  };
}
export function decodeRecord(value: unknown): RpgRecord {
  const source = objectValue(value, "Record");
  const values = objectValue(source.values, "values");
  const decodedValues: RecordValues = Object.create(null) as RecordValues;
  for (const [key, entry] of Object.entries(values)) decodedValues[key] = requiredString(entry, `values.${key}`);
  return { id: uuid(source.id, "id"), templateId: uuid(source.templateId, "templateId"), values: decodedValues, createdAt: isoDate(source.createdAt, "createdAt"), updatedAt: isoDate(source.updatedAt, "updatedAt") };
}
export function decodeRecordPage(value: unknown): RecordPage {
  const source = objectValue(value, "RecordPage");
  if (!Array.isArray(source.items)) throw new Error("items must be an array");
  return { items: source.items.map(decodeRecord), ...(source.nextCursor === undefined ? {} : { nextCursor: uuid(source.nextCursor, "nextCursor") }) };
}
function decodeList<T>(value: unknown, decoder: (entry: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error("Response must be an array");
  return value.map(decoder);
}
export const decodeSystemList = (value: unknown) => decodeList(value, decodeSystem);
export const decodeCollectionList = (value: unknown) => decodeList(value, decodeCollection);
export const decodeTemplateList = (value: unknown) => decodeList(value, decodeTemplate);
