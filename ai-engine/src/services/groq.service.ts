import Groq from "groq-sdk";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";
import { logger } from "../utils/logger";

export type ModelType = "fast" | "quality";

export class GroqService {
  private currentKeyIndex = 0;
  private readonly maxRetries = 2;

  private getNextKey(): { apiKey: string; index: number } {
    if (!env.groqApiKeys.length) {
      throw new HttpError(500, "Missing GROQ_API_KEYS in environment");
    }

    const index = this.currentKeyIndex % env.groqApiKeys.length;
    const apiKey = env.groqApiKeys[index];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % env.groqApiKeys.length;
    return { apiKey, index };
  }

  private getModelForType(modelType: ModelType): string {
    return modelType === "quality" ? env.groqQualityModel : env.groqFastModel;
  }

  public async generateContent(prompt: string): Promise<string> {
    return this.generateContentWithModel(prompt, "fast");
  }

  public async generateContentWithModel(
    prompt: string,
    modelType: ModelType
  ): Promise<string> {
    const model = this.getModelForType(modelType);
    const maxAttempts = this.maxRetries + 1;
    let lastMessage = "Groq API failure";

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const { apiKey, index } = this.getNextKey();
      const client = new Groq({ apiKey });

      try {
        const response = await client.chat.completions.create({
          model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You must return valid JSON only. Do not include markdown, backticks, or explanations.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const content = response.choices?.[0]?.message?.content?.trim();
        if (!content) {
          throw new HttpError(502, "Empty response from Groq API");
        }

        return content;
      } catch (error: unknown) {
        const maybeError = error as {
          status?: number;
          message?: string;
          error?: { message?: string };
        };
        const status = maybeError?.status;
        const message =
          maybeError?.error?.message || maybeError?.message || "Groq API failure";
        lastMessage = message;

        logger.error(
          `Groq failure | modelType=${modelType} model=${model} keyIndex=${index} attempt=${attempt + 1}/${maxAttempts} message=${message}`
        );

        if (
          status === 401 ||
          /invalid api key|unauthorized|incorrect api key/i.test(message)
        ) {
          continue;
        }

        if (error instanceof HttpError) {
          if (attempt < maxAttempts - 1) {
            continue;
          }
          throw error;
        }

        if (attempt < maxAttempts - 1) {
          continue;
        }
      }
    }

    throw new HttpError(
      502,
      `Groq request failed after ${maxAttempts} attempts: ${lastMessage}`
    );
  }

  public getDebugInfo(): {
    totalApiKeys: number;
    currentKeyIndex: number;
    fastModel: string;
    qualityModel: string;
  } {
    return {
      totalApiKeys: env.groqApiKeys.length,
      currentKeyIndex: this.currentKeyIndex,
      fastModel: env.groqFastModel,
      qualityModel: env.groqQualityModel,
    };
  }
}
