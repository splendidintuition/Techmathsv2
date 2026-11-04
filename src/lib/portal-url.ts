const configuredPortalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "/portal";

export function portalHref(audience?: "client" | "engineer") {
  if (!audience) return configuredPortalUrl;
  const separator = configuredPortalUrl.includes("?") ? "&" : "?";
  return `${configuredPortalUrl}${separator}audience=${audience}`;
}
