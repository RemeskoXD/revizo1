export class PayloadTooLargeError extends Error {
  constructor(message = "Payload too large") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

export async function readJsonBody<T = unknown>(
  req: Request,
  maxBytes: number = 48_000
): Promise<T> {
  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    throw new PayloadTooLargeError();
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  if (!text || text.trim() === "") {
    throw new SyntaxError("Empty body");
  }
  return JSON.parse(text) as T;
}
