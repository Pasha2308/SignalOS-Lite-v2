import Parser from "rss-parser";
import { HttpError } from "../utils/http-error";
import {
  StoredTrendItem,
  TrendStorageService,
} from "./trend-storage.service";

export type TrendTopic =
  | "AI"
  | "startups"
  | "SaaS"
  | "Marketing"
  | "Finance";

export type TrendItem = {
  title: string;
  link: string;
  publishedAt: string;
  isUsed: boolean;
  isNew: boolean;
};

type FeedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
};

export class RssService {
  private readonly parser = new Parser();
  private readonly storage = new TrendStorageService();

  private resolveQuery(topic: string): string {
    const normalized = topic.trim().toLowerCase();
    if (normalized === "ai") {
      return "latest AI developments";
    }
    if (normalized === "startups" || normalized === "startup") {
      return "startup funding trends";
    }
    if (normalized === "saas") {
      return "SaaS growth strategies";
    }
    if (normalized === "marketing") {
      return "digital marketing trends";
    }
    if (normalized === "finance") {
      return "finance market trends";
    }
    throw new HttpError(
      400,
      "topics must include only: AI, startups, SaaS, Marketing, Finance"
    );
  }

  public async getTrends(topics: string[]): Promise<TrendItem[]> {
    try {
      const normalizedTopics = topics
        .map((topic) => topic.trim())
        .filter(Boolean);
      if (normalizedTopics.length === 0) {
        throw new HttpError(400, "at least one topic is required");
      }

      const feeds = await Promise.all(
        normalizedTopics.map(async (topic) => {
          const query = this.resolveQuery(topic);
          const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
            query
          )}&hl=en-US&gl=US&ceid=US:en`;
          return this.parser.parseURL(url);
        })
      );

      const fetched = feeds
        .flatMap((feed) => feed.items || [])
        .slice(0, normalizedTopics.length * 5)
        .map((item: FeedItem) => ({
          title: String(item.title ?? "").trim(),
          link: String(item.link ?? "").trim(),
          publishedAt:
            item.isoDate || item.pubDate || new Date().toISOString(),
        }))
        .filter((item) => item.title && item.link);

      const fetchedUnique = Array.from(
        new Map(
          fetched.map((item) => [item.title.trim().toLowerCase(), item] as const)
        ).values()
      );

      const existing = this.storage.list();
      const existingByTitle = new Map(
        existing.map((item) => [item.title.trim().toLowerCase(), item])
      );

      const now = new Date().toISOString();
      const newItems: StoredTrendItem[] = [];

      for (const item of fetchedUnique) {
        if (!this.storage.checkDuplicate(item.title, existing)) {
          newItems.push({
            title: item.title,
            link: item.link,
            publishedAt: item.publishedAt,
            isUsed: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      if (newItems.length > 0) {
        this.storage.save([...newItems, ...existing]);
      }

      const merged = this.storage.list();
      const isRecent = (publishedAt: string): boolean => {
        const published = new Date(publishedAt).getTime();
        if (Number.isNaN(published)) {
          return false;
        }
        return Date.now() - published <= 3 * 24 * 60 * 60 * 1000;
      };

      return merged
        .filter((item) => {
          const normalized = item.title.trim().toLowerCase();
          const isJustFetched = existingByTitle.has(normalized) === false;
          return isJustFetched || isRecent(item.publishedAt);
        })
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        )
        .slice(0, 10)
        .map((item) => ({
          title: item.title,
          link: item.link,
          publishedAt: item.publishedAt,
          isUsed: item.isUsed,
          isNew: !item.isUsed,
        }));
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(502, "Failed to fetch trends from RSS feed");
    }
  }

  public markTrendUsed(title: string): boolean {
    return this.storage.markUsed(title);
  }
}
