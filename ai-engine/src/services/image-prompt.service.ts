import { GroqService } from "./groq.service";
import { parseJsonStrict } from "../utils/json-parser";
import { HttpError } from "../utils/http-error";

export class ImagePromptService {
  constructor(private readonly groqService: GroqService) {}

  public async generateImagePrompt(linkedinContent: string): Promise<string> {
    const body = linkedinContent.trim();
    if (!body) {
      throw new HttpError(400, "content is required");
    }

    const prompt = [
      "Create ONE high-quality image generation prompt for visual marketing art.",
      "The image should complement this LinkedIn-style post (themes and mood only — do not quote the post):",
      "",
      body.slice(0, 6000),
      "",
      'Return JSON only: { "prompt": "<detailed art direction, style, mood, composition>" }',
    ].join("\n");

    const responseText = await this.groqService.generateContentWithModel(
      prompt,
      "quality"
    );
    const parsed = parseJsonStrict<{ prompt?: string }>(responseText);
    const out = String(parsed?.prompt ?? "").trim();
    if (!out) {
      throw new HttpError(502, "Empty image prompt from model");
    }
    return out;
  }
}
