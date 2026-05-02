import Parser from "rss-parser";
import { logger } from "../utils/logger";

export type SignalItem = {
  title: string;
  summary: string;
};

export type UrlPreview = {
  title: string;
  description: string;
  paragraphs: string;
  /** Ready-to-paste excerpt for style samples */
  combined: string;
};

/**
 * Lightweight headline ingestion from URLs (RSS/XML or rough HTML).
 * On failure, falls back to URL-only so callers never crash.
 */
export class SignalsIngestService {
  private readonly parser = new Parser();

  public async fetchSignals(urls: string[]): Promise<SignalItem[]> {
    const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
    const results = await Promise.all(unique.map((u) => this.fetchOne(u)));
    return results.filter((r) => r.title.length > 0);
  }

  /**
   * Lightweight HTML (or RSS) fetch for UI paste fallback — no third-party APIs.
   */
  public async fetchUrlPreview(url: string): Promise<UrlPreview | null> {
    const trimmed = url.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      return null;
    }
    try {
      const res = await fetch(trimmed, {
        headers: {
          "User-Agent": "SignalOS-Lite/2.0 (url-preview)",
          Accept:
            "application/rss+xml, application/xml, text/xml, text/html, */*",
        },
      });
      if (!res.ok) {
        return null;
      }
      const text = await res.text();
      const ct = res.headers.get("content-type") ?? "";

      if (
        ct.includes("xml") ||
        text.trimStart().startsWith("<?xml") ||
        /<rss[\s>]/i.test(text.slice(0, 200))
      ) {
        const feed = await this.parser.parseString(text);
        const item = feed.items?.[0];
        const title = String(item?.title ?? "").trim() || trimmed;
        const raw =
          String(
            item?.contentSnippet ??
              item?.summary ??
              item?.description ??
              ""
          )
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const description = raw.slice(0, 500);
        const paragraphs = raw.length > 80 ? raw.slice(0, 2000) : description;
        const combined = this.buildCombined(title, description, paragraphs);
        return { title, description, paragraphs, combined };
      }

      const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      let title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";
      if (!title) title = trimmed;

      const metaDesc =
        text.match(
          /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
        )?.[1] ??
        text.match(
          /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
        )?.[1] ??
        text.match(
          /<meta[^>]+property=["']twitter:description["'][^>]+content=["']([^"']+)["']/i
        )?.[1];

      const description = metaDesc?.trim().slice(0, 800) ?? "";

      const paragraphs = this.extractParagraphsFromHtml(text);
      const combined = this.buildCombined(title, description, paragraphs);
      return { title, description, paragraphs, combined };
    } catch (e) {
      logger.error(`url preview failed for ${url}: ${String(e)}`);
      return null;
    }
  }

  private buildCombined(
    title: string,
    description: string,
    paragraphs: string
  ): string {
    const parts: string[] = [];
    if (title) parts.push(`Title: ${title}`);
    if (description) parts.push(`Meta / summary: ${description}`);
    if (paragraphs.trim()) parts.push(paragraphs.trim());
    return parts.join("\n\n").trim();
  }

  private extractParagraphsFromHtml(html: string): string {
    const chunks: string[] = [];
    const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(html)) !== null && n < 6) {
      const plain = m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (plain.length >= 25) {
        chunks.push(plain);
        n++;
      }
    }
    return chunks.join("\n\n").slice(0, 4000);
  }

  private async fetchOne(url: string): Promise<SignalItem> {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "SignalOS-Lite/2.0 (signals)",
          Accept: "application/rss+xml, application/xml, text/xml, text/html",
        },
      });
      if (!res.ok) {
        return { title: url, summary: "" };
      }
      const text = await res.text();
      const ct = res.headers.get("content-type") ?? "";

      if (
        ct.includes("xml") ||
        text.trimStart().startsWith("<?xml") ||
        /<rss[\s>]/i.test(text.slice(0, 200))
      ) {
        const feed = await this.parser.parseString(text);
        const item = feed.items?.[0];
        const title = String(item?.title ?? "").trim() || url;
        const summary =
          String(
            item?.contentSnippet ??
              item?.summary ??
              item?.description ??
              ""
          )
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 500);
        return { title, summary };
      }

      const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      let title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";
      if (!title) title = url;

      const metaDesc =
        text.match(
          /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
        )?.[1] ??
        text.match(
          /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
        )?.[1];

      let summary = metaDesc?.trim().slice(0, 500) ?? "";
      if (!summary) {
        const firstP = text.match(/<p[^>]*>([\s\S]{20,800})<\/p>/i);
        if (firstP?.[1]) {
          summary = firstP[1]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 500);
        }
      }

      return { title, summary };
    } catch (e) {
      logger.error(`signals fetch failed for ${url}: ${String(e)}`);
      return { title: url, summary: "" };
    }
  }
}
