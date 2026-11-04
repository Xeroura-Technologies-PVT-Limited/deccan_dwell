/**
 * Read a JSON response safely. Some failures (a crashed route, a proxy error)
 * come back with an empty or non-JSON body, and `response.json()` would throw
 * "Unexpected end of JSON input" at the guest. This always resolves to an
 * object, and fills in a human `error` for failed responses.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJson<T = any>(response: Response): Promise<T & { error?: string }> {
  let data: Record<string, unknown> = {};
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok && typeof data.error !== "string") {
    data.error =
      response.status >= 500
        ? "Our reservation system is unavailable right now. Please try again shortly, or call us on +91 9945 465 380."
        : "Something went wrong. Please try again.";
  }
  return data as T & { error?: string };
}
