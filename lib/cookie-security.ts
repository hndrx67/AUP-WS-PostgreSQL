export function resolveCookieSecurity({
  nodeEnv = process.env.NODE_ENV,
  forwardedProto,
  appUrl,
}: {
  nodeEnv?: string;
  forwardedProto?: string | null;
  appUrl?: string | null;
} = {}) {
  if (nodeEnv !== "production") return false;
  const normalizedProto = (forwardedProto ?? "").toLowerCase().trim();
  if (normalizedProto === "https") return true;
  const normalizedAppUrl = (appUrl ?? "").toLowerCase().trim();
  return normalizedAppUrl.startsWith("https://");
}
