import { GroqService } from "./groq.service";
import { IdeaType } from "./idea.service";
import { parseJsonStrict } from "../utils/json-parser";
import { HttpError } from "../utils/http-error";
import { hashInput } from "../utils/hash";
import { logger } from "../utils/logger";

export type WritingStyle =
  | "professional"
  | "casual"
  | "bold"
  | "storytelling"
  | "contrarian"
  | "analytical";

export type ContentSignal = {
  title: string;
  summary: string;
};

export type GeneratedContent = {
  linkedin: string;
  twitter: string[];
};

export type GenerationContext = {
  styleProfile?: string;
  signals?: ContentSignal[];
};

export class ContentService {
  private readonly cache = new Map<string, GeneratedContent>();

  constructor(private readonly groqService: GroqService) {}

  public async generateFromIdea(
    ideaTitle: string,
    type: IdeaType,
    style: WritingStyle = "professional",
    context?: GenerationContext
  ): Promise<GeneratedContent> {
    const ctxKey = hashInput(
      JSON.stringify({
        p: context?.styleProfile ?? "",
        s: context?.signals ?? [],
      })
    );
    const cacheKey = hashInput(`${ideaTitle}|${type}|${style}|${ctxKey}`);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.info("cache hit");
      return cached;
    }
    logger.info("cache miss");

    const prompt = this.buildPrompt(ideaTitle, type, style, context);

    const responseText = await this.groqService.generateContentWithModel(
      prompt,
      "quality"
    );
    const parsed = parseJsonStrict<GeneratedContent>(responseText);

    const isValid =
      typeof parsed?.linkedin === "string" &&
      parsed.linkedin.trim().length > 0 &&
      Array.isArray(parsed?.twitter) &&
      parsed.twitter.length === 5 &&
      parsed.twitter.every((tweet) => typeof tweet === "string" && tweet.trim());

    if (!isValid) {
      throw new HttpError(502, "AI returned invalid generated content");
    }

    const generated = {
      linkedin: parsed.linkedin.trim(),
      twitter: parsed.twitter.map((tweet) => tweet.trim()),
    };

    this.cache.set(cacheKey, generated);
    return generated;
  }

  private buildPrompt(
    ideaTitle: string,
    type: IdeaType,
    style: WritingStyle,
    context?: GenerationContext
  ): string {
    const styleHint = this.styleHints(style);
    const blocks: string[] = [
      "Create original social content from this idea.",
      "Do NOT copy phrases from context headlines or samples — invent fresh wording.",
      `Idea title: ${ideaTitle}`,
      `Idea type: ${type}`,
      `Voice / variant: ${style}`,
      styleHint,
      "",
    ];

    const profile = context?.styleProfile?.trim();
    if (profile) {
      blocks.push(
        "Writing-style guidance (follow rhythm and tone — never paste sample lines):",
        profile,
        ""
      );
    }

    const signals = context?.signals?.filter(
      (x) => x.title.trim() || x.summary.trim()
    );
    if (signals && signals.length > 0) {
      blocks.push(
        "Real-world themes to reflect (original analysis only):",
        ...signals.map(
          (sig) =>
            `- ${sig.title.trim()}${sig.summary.trim() ? `: ${sig.summary.trim().slice(0, 400)}` : ""}`
        ),
        ""
      );
    }

    blocks.push(
      "Rules:",
      "- LinkedIn: first line must be a strong hook.",
      "- LinkedIn: short paragraphs (1-2 sentences each).",
      "- Twitter: exactly 5 tweets.",
      "- Twitter: tweet 1 must have a strong hook.",
      "- Twitter: each tweet must feel standalone and still work as a thread.",
      "- Keep language concrete and post-ready.",
      "",
      "Return valid JSON only in this exact shape:",
      '{ "linkedin": "string", "twitter": ["tweet1","tweet2","tweet3","tweet4","tweet5"] }'
    );

    return blocks.join("\n");
  }

  private styleHints(style: WritingStyle): string {
    switch (style) {
      case "professional":
        return "Tone: credible, concise, leadership voice.";
      case "casual":
        return "Tone: conversational, relaxed, approachable.";
      case "bold":
        return "Tone: assertive hooks, strong opinions, momentum.";
      case "storytelling":
        return "Tone: narrative arc, scene-setting, emotional beats.";
      case "contrarian":
        return "Tone: challenge consensus, sharp tension, respectful debate.";
      case "analytical":
        return "Tone: frameworks, logic, data-forward clarity.";
      default:
        return "";
    }
  }

  public async generateVariantsFromIdea(
    ideaTitle: string,
    type: IdeaType,
    styles: WritingStyle[],
    context?: GenerationContext
  ): Promise<Array<{ style: WritingStyle; linkedin: string; twitter: string[] }>> {
    const uniqueStyles = Array.from(new Set(styles));
    const variants = await Promise.all(
      uniqueStyles.map(async (style) => {
        const generated = await this.generateFromIdea(
          ideaTitle,
          type,
          style,
          context
        );
        return {
          style,
          linkedin: generated.linkedin,
          twitter: generated.twitter,
        };
      })
    );
    return variants;
  }
}
