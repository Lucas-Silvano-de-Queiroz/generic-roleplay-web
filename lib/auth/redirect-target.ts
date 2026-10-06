import { isUuid } from "@/lib/api/contracts";

export function safeNextPath(candidate: unknown): string {
  if (typeof candidate !== "string" || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || /%2f|%5c/i.test(candidate)) return "/systems";
  let decoded: string;
  try { decoded = decodeURIComponent(candidate); } catch { return "/systems"; }
  if (decoded.startsWith("//") || decoded.includes("\\") || decoded.includes("\0") || /%2f|%5c/i.test(decoded)) return "/systems";
  const segments = decoded.split("/").filter(Boolean);
  const [section, id, third, fourth] = segments;
  const isResource = (value: string | undefined) => value !== undefined && isUuid(value);
  const allowed = decoded === "/systems" || decoded === "/systems/new" || decoded === "/settings/account" ||
    (section === "systems" && isResource(id) && (segments.length === 2 || (third === "edit" && segments.length === 3) || (third === "collections" && fourth === "new" && segments.length === 4))) ||
    (section === "collections" && isResource(id) && (segments.length === 2 || (third === "edit" && segments.length === 3) || (third === "templates" && fourth === "new" && segments.length === 4))) ||
    (section === "templates" && isResource(id) && (segments.length === 2 || (third === "edit" && segments.length === 3) || (third === "records" && fourth === "new" && segments.length === 4))) ||
    (section === "records" && isResource(id) && (segments.length === 2 || (third === "edit" && segments.length === 3)));
  if (!allowed) return "/systems";
  return decoded;
}
