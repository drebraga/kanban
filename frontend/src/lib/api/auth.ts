import { apiRequest } from "./client";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "./types";

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterPayload) {
  return apiRequest<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(token: string) {
  return apiRequest<User>("/auth/me", {
    token,
  });
}
