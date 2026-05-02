import { GroqService } from "./groq.service";
import { parseJsonStrict } from "../utils/json-parser";
import { HttpError } from "../utils/http-error";

/**
 * Derives a reusable style profile from sample text — patterns only, no copying.
 */
export class StyleProfileService {
  constructor(private readonly groqService: GroqService) {}

  public async extractStyleProfile(samples: string): Promise<string> {
    const trimmed = samples.trim();
    if (!trimmed) {
      return "";
    }

    const prompt = [
      "You are analyzing writing STYLE only from the samples below.",
      "Rules:",
      "- Do NOT quote, reproduce, or paraphrase sample sentences.",
      "- Do NOT copy facts, names, or proprietary lines.",
      "- Summarize observable patterns: hook style, sentence length, tone, formatting habits, structure.",
      "Output JSON only: { \"styleProfile\": \"<concise instructions a writer could follow>\" }",
      "",
      "Samples (for pattern inference only):",
      trimmed.slice(0, 12000),
    ].join("\n");

    const responseText = await this.groqService.generateContentWithModel(
      prompt,
      "quality"
    );
    const parsed = parseJsonStrict<{ styleProfile?: string }>(responseText);
    const profile = String(parsed?.styleProfile ?? "").trim();
    if (!profile) {
      throw new HttpError(502, "Could not extract style profile");
    }
    return profile;
  }
}
