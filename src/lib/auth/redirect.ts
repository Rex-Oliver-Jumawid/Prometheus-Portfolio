export function safeRedirectPath(value: unknown, fallback = "/dashboard") {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }

  try {
    const baseUrl = new URL("https://app.local");
    const redirectUrl = new URL(value, baseUrl);

    if (redirectUrl.origin !== baseUrl.origin) return fallback;

    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return fallback;
  }
}
