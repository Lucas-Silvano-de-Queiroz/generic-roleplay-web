import "server-only";

export function getApiBaseUrl(): URL {
  const rawUrl = process.env.API_BASE_URL;
  if (!rawUrl) throw new Error("API_BASE_URL is required");
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV === "development" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("API_BASE_URL must use HTTPS outside local development");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url;
}
