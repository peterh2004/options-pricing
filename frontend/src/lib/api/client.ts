// Typed API client. Every response is parsed through Zod, so app code never sees raw JSON.

import { z } from "zod";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    throw new ApiError(0, null, `network error reaching ${url}: ${(e as Error).message}`);
  }
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(res.status, text, `non-JSON response from ${url}`);
  }
  if (!res.ok) {
    throw new ApiError(res.status, parsed, `${res.status} from ${url}`);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new ApiError(res.status, parsed, `schema mismatch: ${result.error.message}`);
  }
  return result.data;
}

export const api = {
  get: <T>(path: string, schema: z.ZodType<T>) =>
    request(path, schema, { method: "GET" }),
  post: <T>(path: string, body: unknown, schema: z.ZodType<T>) =>
    request(path, schema, { method: "POST", body: JSON.stringify(body) }),
};
