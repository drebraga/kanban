const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type RequestOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  { token, headers, ...options }: RequestOptions = {}
): Promise<T> {
  const isJsonBody = typeof options.body === "string";

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const rawMessage =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      (typeof data.message === "string" || Array.isArray(data.message))
        ? data.message
        : null;

    const message = Array.isArray(rawMessage)
      ? rawMessage.join(" ")
      : (rawMessage ?? "Não foi possível completar a solicitação.");

    throw new ApiError(message, response.status);
  }

  return data as T;
}
