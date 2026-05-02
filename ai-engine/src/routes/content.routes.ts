import { Router } from "express";
import { ContentController } from "../controllers/content.controller";
import { GroqService } from "../services/groq.service";
import { IdeaService } from "../services/idea.service";
import { ContentService } from "../services/content.service";
import { RefreshService } from "../services/refresh.service";
import { endpointRateLimit } from "../middleware/rate-limit.middleware";
import { RssService } from "../services/rss.service";
import { StyleProfileService } from "../services/style-profile.service";
import { SignalsIngestService } from "../services/signals-ingest.service";
import { ImagePromptService } from "../services/image-prompt.service";

const contentRouter = Router();

const groqService = new GroqService();
const ideaService = new IdeaService(groqService);
const contentService = new ContentService(groqService);
const refreshService = new RefreshService();
const rssService = new RssService();
const styleProfileService = new StyleProfileService(groqService);
const signalsIngestService = new SignalsIngestService();
const imagePromptService = new ImagePromptService(groqService);
const contentController = new ContentController(
  ideaService,
  contentService,
  refreshService,
  groqService,
  rssService,
  styleProfileService,
  signalsIngestService,
  imagePromptService
);

contentRouter.post(
  "/ideas",
  endpointRateLimit("/ideas"),
  contentController.createIdeas
);
contentRouter.post(
  "/generate",
  endpointRateLimit("/generate"),
  contentController.generate
);
contentRouter.post(
  "/style-profile",
  endpointRateLimit("/style-profile"),
  contentController.extractStyleProfile
);
contentRouter.post(
  "/signals",
  endpointRateLimit("/signals"),
  contentController.fetchSignalsFromUrls
);
contentRouter.post(
  "/url-preview",
  endpointRateLimit("/url-preview"),
  contentController.urlPreview
);
contentRouter.post(
  "/image-prompt",
  endpointRateLimit("/image-prompt"),
  contentController.createImagePrompt
);
contentRouter.post("/refresh", contentController.refresh);
contentRouter.post(
  "/pipeline",
  endpointRateLimit("/pipeline"),
  contentController.pipeline
);
contentRouter.post(
  "/daily-content",
  endpointRateLimit("/daily-content"),
  contentController.dailyContent
);
contentRouter.post(
  "/plan-content",
  endpointRateLimit("/plan-content"),
  contentController.planContent
);
contentRouter.get("/debug/groq", contentController.debugGroq);
contentRouter.get("/trends", contentController.trends);
contentRouter.post("/trends/use", contentController.markTrendUsed);

export { contentRouter };
