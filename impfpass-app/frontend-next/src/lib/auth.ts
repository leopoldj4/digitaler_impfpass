export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export const ACCESS_TOKEN_KEY = "digitaler_impfpass_access_token";
export const ACCESS_TOKEN_COOKIE = "digitaler_impfpass_access_token";

export function getBrowserAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAuthSession(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 30}; samesite=lax`;
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

