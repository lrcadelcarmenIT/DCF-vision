export async function requestJson<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(20000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(url, { method: body === undefined ? "GET" : "POST", cache: "no-store", credentials: "same-origin", signal: requestSignal, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (error) {
    if (timeout.aborted && !signal?.aborted) throw new Error("The request timed out. Try again; retrying a save will not duplicate its record.");
    throw error;
  }
  let result: unknown;
  try { result = await response.json(); } catch { throw new Error("The server returned an unreadable response. Please try again."); }
  if (!response.ok) {
    const error = result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "The request could not be completed.";
    throw new Error(error);
  }
  return result as T;
}

export function csvCell(value: string | number) {
  let text = String(value);
  // Prevent spreadsheet formula execution when user-entered names and notes are exported.
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
