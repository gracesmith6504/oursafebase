export const PRODUCTION_URL = "https://oursafebase.com";

export const getAppUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_PUBLIC_APP_URL as string | undefined;
  if (envUrl && typeof envUrl === "string") {
    // Normalize by removing any trailing slash
    return envUrl.replace(/\/$/, "");
  }
  return PRODUCTION_URL;
};
