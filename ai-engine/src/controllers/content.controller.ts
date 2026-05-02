import { Request, Response } from "express";
import { IdeaService, IdeaType } from "../services/idea.service";
import {
  ContentService,
  WritingStyle,
  ContentSignal,
  GenerationContext,
} from "../services/content.service";
import { RefreshService } from "../services/refresh.service";
import { HttpError } from "../utils/http-error";
import { GroqService } from "../services/groq.service";
import { RssService } from "../services/rss.service";
import { StyleProfileService } from "../services/style-profile.service";
import { SignalsIngestService } from "../services/signals-ingest.service";
import { ImagePromptService } from "../services/image-prompt.service";

const allowedTypes: IdeaType[] = [
  "educational",
  "story",
  "hot_take",
  "contrarian",
  "list",
];

const isAllowedType = (value: string): value is IdeaType =>
  allowedTypes.includes(value as IdeaType);

const allowedStyles: WritingStyle[] = [
  "professional",
  "casual",
  "bold",
  "storytelling",
  "contrarian",
  "analytical",
];

const isAllowedStyle = (value: string): value is WritingStyle =>
  allowedStyles.includes(value as WritingStyle);

export class ContentController {
  constructor(
    private readonly ideaService: IdeaService,
    private readonly contentService: ContentService,
    private readonly refreshService: RefreshService,
    private readonly groqService: GroqService,
    private readonly rssService: RssService,
    private readonly styleProfileService: StyleProfileService,
    private readonly signalsIngestService: SignalsIngestService,
    private readonly imagePromptService: ImagePromptService
  ) {}

  private parseGenerationContext(req: Request): GenerationContext {
    const styleProfile = String(req.body?.styleProfile ?? "").trim();
    const rawSignals = Array.isArray(req.body?.signals)
      ? (req.body.signals as unknown[])
      : [];
    const signals: ContentSignal[] = rawSignals
      .map((item) => {
        const rec = item as Record<string, unknown>;
        return {
          title: String(rec?.title ?? "").trim(),
          summary: String(rec?.summary ?? "").trim(),
        };
      })
      .filter((s) => s.title.length > 0 || s.summary.length > 0);

    const ctx: GenerationContext = {};
    if (styleProfile) ctx.styleProfile = styleProfile;
    if (signals.length > 0) ctx.signals = signals;
    return ctx;
  }

  public extractStyleProfile = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const samples = String(req.body?.samples ?? "").trim();
      if (!samples) {
        throw new HttpError(400, "samples is required");
      }
      const styleProfile =
        await this.styleProfileService.extractStyleProfile(samples);
      res.status(200).json({ styleProfile });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public fetchSignalsFromUrls = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const urlsRaw = Array.isArray(req.body?.urls)
        ? (req.body.urls as unknown[])
        : [];
      const urls = urlsRaw.map((u) => String(u).trim()).filter(Boolean);
      if (urls.length === 0) {
        throw new HttpError(400, "urls array is required");
      }
      const signals = await this.signalsIngestService.fetchSignals(urls);
      res.status(200).json({ signals });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public urlPreview = async (req: Request, res: Response): Promise<void> => {
    try {
      const url = String(req.body?.url ?? "").trim();
      if (!url) {
        throw new HttpError(400, "url is required");
      }
      const preview = await this.signalsIngestService.fetchUrlPreview(url);
      if (!preview) {
        throw new HttpError(502, "Could not fetch or parse this URL");
      }
      res.status(200).json({ preview });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public createImagePrompt = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const content = String(req.body?.content ?? "").trim();
      const prompt = await this.imagePromptService.generateImagePrompt(content);
      res.status(200).json({ prompt });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public createIdeas = async (req: Request, res: Response): Promise<void> => {
    try {
      const content = String(req.body?.content ?? "").trim();
      const newsTitle = String(req.body?.newsItem?.title ?? "").trim();
      const newsSummary = String(req.body?.newsItem?.summary ?? "").trim();

      const sourceText = newsTitle
        ? [newsTitle, newsSummary].filter(Boolean).join("\n")
        : content;

      if (!sourceText) {
        throw new HttpError(400, "content is required");
      }

      const ideas = await this.ideaService.generateIdeas(sourceText);
      const recommended = this.ideaService.getRecommendedIdea(ideas);
      res.status(200).json({ ideas, recommended });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public generate = async (req: Request, res: Response): Promise<void> => {
    try {
      const idea = String(req.body?.idea ?? "").trim();
      const type = String(req.body?.type ?? "").trim();
      const rawStyle = String(req.body?.style ?? "professional").trim();
      const rawStyles = Array.isArray(req.body?.styles)
        ? req.body.styles.map((style: unknown) => String(style).trim())
        : null;

      if (!idea) {
        throw new HttpError(400, "idea is required");
      }
      if (!type || !isAllowedType(type)) {
        throw new HttpError(
          400,
          "type is required and must be one of: educational, story, hot_take, contrarian, list"
        );
      }
      if (rawStyles && rawStyles.length > 0) {
        const validStyles = rawStyles.filter(isAllowedStyle);
        if (validStyles.length !== rawStyles.length) {
          throw new HttpError(
            400,
            "styles must contain only: professional, casual, bold, storytelling, contrarian, analytical"
          );
        }

        const genContext = this.parseGenerationContext(req);
        const variants = await this.contentService.generateVariantsFromIdea(
          idea,
          type,
          validStyles,
          Object.keys(genContext).length > 0 ? genContext : undefined
        );
        res.status(200).json({ variants });
        return;
      }

      if (!isAllowedStyle(rawStyle)) {
        throw new HttpError(
          400,
          "style must be one of: professional, casual, bold, storytelling, contrarian, analytical"
        );
      }

      const genContextSingle = this.parseGenerationContext(req);
      const content = await this.contentService.generateFromIdea(
        idea,
        type,
        rawStyle,
        Object.keys(genContextSingle).length > 0
          ? genContextSingle
          : undefined
      );
      res.status(200).json(content);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const content = String(req.body?.content ?? "").trim();
      if (!content) {
        throw new HttpError(400, "content is required");
      }

      this.refreshService.save(content);
      const ideas = await this.ideaService.generateIdeas(content);

      res.status(200).json({
        ideas,
        savedItems: this.refreshService.list().length,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public pipeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const content = String(req.body?.content ?? "").trim();
      const rawStyle = String(req.body?.style ?? "professional").trim();

      if (!content) {
        throw new HttpError(400, "content is required");
      }
      if (!isAllowedStyle(rawStyle)) {
        throw new HttpError(
          400,
          "style must be one of: professional, casual, bold, storytelling, contrarian, analytical"
        );
      }

      const ideas = await this.ideaService.generateIdeas(content);
      const selectedIdea = ideas[0];
      if (!selectedIdea) {
        throw new HttpError(502, "No ideas generated");
      }

      const generated = await this.contentService.generateFromIdea(
        selectedIdea.title,
        selectedIdea.type,
        rawStyle
      );

      res.status(200).json({
        ideas,
        selectedIdea,
        content: generated,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public dailyContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const topicsRaw = Array.isArray(req.body?.topics)
        ? (req.body.topics as string[])
        : [];
      const topics =
        topicsRaw.length > 0 ? topicsRaw : ["AI", "startups", "SaaS"];

      const trends = await this.rssService.getTrends(topics);
      const topTrends = trends.slice(0, 3);

      const results = await Promise.all(
        topTrends.map(async (trend) => {
          const ideas = await this.ideaService.generateIdeas(trend.title);
          const recommended = this.ideaService.getRecommendedIdea(ideas);
          const content = await this.contentService.generateFromIdea(
            recommended.title,
            recommended.type,
            "professional"
          );

          return {
            trendTitle: trend.title,
            idea: recommended,
            content,
          };
        })
      );

      res.status(200).json(results);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public planContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const topicsRaw = Array.isArray(req.body?.topics)
        ? (req.body.topics as string[])
        : [];
      const topics =
        topicsRaw.length > 0 ? topicsRaw : ["AI", "startups", "SaaS"];

      const trends = await this.rssService.getTrends(topics);
      const topTrends = trends.slice(0, 4);

      const slots = [
        { time: "09:00", label: "morning", planType: "thought_leadership" },
        { time: "14:00", label: "afternoon", planType: "educational" },
        { time: "19:00", label: "evening", planType: "story" },
        { time: "21:00", label: "evening", planType: "hot_take" },
      ];

      const results = await Promise.all(
        topTrends.map(async (trend, index) => {
          const ideas = await this.ideaService.generateIdeas(trend.title);
          const recommended = this.ideaService.getRecommendedIdea(ideas);
          const content = await this.contentService.generateFromIdea(
            recommended.title,
            recommended.type,
            "professional"
          );

          const slot = slots[index] ?? slots[slots.length - 1];

          return {
            time: slot.time,
            type: slot.planType,
            idea: recommended,
            content,
          };
        })
      );

      res.status(200).json(results);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public debugGroq = (_req: Request, res: Response): void => {
    try {
      res.status(200).json(this.groqService.getDebugInfo());
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public trends = async (req: Request, res: Response): Promise<void> => {
    try {
      const topicsQuery = String(req.query?.topics ?? req.query?.topic ?? "").trim();
      const topics = topicsQuery
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean);
      const trends = await this.rssService.getTrends(topics);
      res.status(200).json(trends);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  public markTrendUsed = async (req: Request, res: Response): Promise<void> => {
    try {
      const title = String(req.body?.title ?? "").trim();
      if (!title) {
        throw new HttpError(400, "title is required");
      }

      const updated = this.rssService.markTrendUsed(title);
      if (!updated) {
        throw new HttpError(404, "trend not found");
      }

      res.status(200).json({ success: true });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: unknown, res: Response): void {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Internal server error" });
  }
}
