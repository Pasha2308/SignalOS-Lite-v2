import { HttpError } from "./http-error";

const extractJsonBlock = (raw: string): string => {
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }
  return raw.trim();
};

export const parseJsonStrict = <T>(raw: string): T => {
  const candidate = extractJsonBlock(raw);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    throw new HttpError(502, "AI returned an invalid JSON payload");
  }
};

/** Same extraction as strict parse, but returns null instead of throwing. */
export const parseJsonSafe = (raw: string): unknown | null => {
  const candidate = extractJsonBlock(raw);
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }
};
