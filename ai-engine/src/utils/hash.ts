import { createHash } from "crypto";

export const hashInput = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
