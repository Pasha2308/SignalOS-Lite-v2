import { GroqService } from "./groq.service";
import { parseJsonSafe } from "../utils/json-parser";
import { hashInput } from "../utils/hash";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export type IdeaType =
  | "educational"
  | "story"
  | "hot_take"
  | "contrarian"
  | "list";

export type Idea = {
  title: string;
  type: IdeaType;
};

const ALLOWED_TYPES: IdeaType[] = [
  "educational",
  "story",
  "hot_take",
  "contrarian",
  "list",
];

/** Minimum ideas we aim to return (may pad from fallback). */
const MIN_IDEAS = 3;
/** Never return more than this after trimming. */
const MAX_RETURN = 5;

const FALLBACK_IDEAS: Idea[] = [
  { title: "Why this topic matters", type: "educational" },
  { title: "My take on this trend", type: "hot_take" },
  { title: "A contrarian angle worth debating", type: "contrarian" },
];

export class IdeaService {
  private readonly cache = new Map<string, Idea[]>();

  constructor(private readonly groqService: GroqService) {}

  public async generateIdeas(rawContent: string): Promise<Idea[]> {
    const cacheKey = hashInput(rawContent);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.info("cache hit");
      return cached;
    }
    logger.info("cache miss");

    let ideas =
      (await this.tryGroqIdeas(this.buildMainPrompt(rawContent))) ??
      (await this.tryGroqIdeas(this.buildSimplePrompt(rawContent)));

    if (!ideas.length) {
      ideas = [...FALLBACK_IDEAS];
      logger.info("using fallback ideas (Groq unavailable or invalid JSON)");
    } else if (ideas.length < MIN_IDEAS) {
      ideas = this.padIdeasToMinimum(ideas);
    }

    if (ideas.length > MAX_RETURN) {
      ideas = ideas.slice(0, MAX_RETURN);
    }

    this.cache.set(cacheKey, ideas);
    return ideas;
  }

  private buildMainPrompt(rawContent: string): string {
    return [
      "Analyze the content below and propose 3–7 highly specific, opinionated social post ideas.",
      "Avoid generic advice. Each title should hook like a viral post angle.",
      'Return JSON only in this exact shape: {"ideas":[{"title":"string","type":"educational|story|hot_take|contrarian|list"}, ...]}',
      "Include between 3 and 7 objects in the ideas array.",
      "",
      "Content:",
      rawContent,
    ].join("\n");
  }

  private buildSimplePrompt(rawContent: string): string {
    return [
      "Summarize angles as post ideas.",
      '{"ideas":[{"title":"...","type":"educational|story|hot_take|contrarian|list"}]}',
      "3 to 7 items. JSON only, no markdown.",
      "",
      rawContent,
    ].join("\n");
  }

  /**
   * Calls Groq, logs raw body in development, parses JSON without throwing.
   * Returns normalized ideas or empty array on any failure.
   */
  private async tryGroqIdeas(prompt: string): Promise<Idea[]> {
    let responseText: string;
    try {
      responseText = await this.groqService.generateContentWithModel(
        prompt,
        "fast"
      );
    } catch {
      return [];
    }

    if (!responseText.trim()) {
      return [];
    }

    if (env.nodeEnv === "development") {
      logger.debug(`Groq raw ideas response (before JSON parse):\n${responseText}`);
    }

    const parsed = parseJsonSafe(responseText);
    if (parsed === null) {
      return [];
    }

    const rawItems = this.extractIdeasArray(parsed);
    if (!rawItems.length) {
      return [];
    }

    return this.normalizeIdeas(rawItems);
  }

  private extractIdeasArray(parsed: unknown): unknown[] {
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === "object" && "ideas" in parsed) {
      const ideas = (parsed as { ideas: unknown }).ideas;
      if (Array.isArray(ideas)) {
        return ideas;
      }
    }
    return [];
  }

  private normalizeIdeas(items: unknown[]): Idea[] {
    const out: Idea[] = [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const title = String(rec.title ?? "").trim();
      const typeRaw = String(rec.type ?? "").trim();
      if (!title || !ALLOWED_TYPES.includes(typeRaw as IdeaType)) {
        continue;
      }
      out.push({ title, type: typeRaw as IdeaType });
    }

    const seen = new Set<string>();
    const deduped: Idea[] = [];
    for (const idea of out) {
      const key = idea.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(idea);
    }

    if (deduped.length > MAX_RETURN) {
      return deduped.slice(0, MAX_RETURN);
    }
    return deduped;
  }

  private padIdeasToMinimum(ideas: Idea[]): Idea[] {
    const seen = new Set(ideas.map((i) => i.title.toLowerCase()));
    const next = [...ideas];
    for (const f of FALLBACK_IDEAS) {
      if (next.length >= MIN_IDEAS) break;
      const k = f.title.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        next.push(f);
      }
    }
    let n = 0;
    while (next.length < MIN_IDEAS) {
      n += 1;
      next.push({
        title: `Another angle worth exploring (${n})`,
        type: "story",
      });
    }
    return next;
  }

  public getRecommendedIdea(ideas: Idea[]): Idea {
    const hookWords = [
      "why",
      "how",
      "truth",
      "mistake",
      "lessons",
      "secret",
      "nobody",
      "viral",
      "growth",
      "failed",
      "won",
    ];

    const scored = ideas.map((idea) => {
      const title = idea.title.toLowerCase();
      let score = 0;

      if (idea.title.length >= 40 && idea.title.length <= 110) {
        score += 2;
      }
      if (/[!?]/.test(idea.title)) {
        score += 1;
      }
      if (/\d/.test(idea.title)) {
        score += 1;
      }
      if (hookWords.some((word) => title.includes(word))) {
        score += 2;
      }
      if (idea.type === "hot_take" || idea.type === "contrarian") {
        score += 1;
      }

      return { idea, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.idea ?? ideas[0];
  }
}
