import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseCsv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const env = {
  port: toNumber(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  groqApiKeys: parseCsv(process.env.GROQ_API_KEYS),
  groqFastModel: process.env.GROQ_FAST_MODEL ?? "llama-3.1-8b-instant",
  groqQualityModel: process.env.GROQ_QUALITY_MODEL ?? "llama-3.3-70b-versatile",
};
