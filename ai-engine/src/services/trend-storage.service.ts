import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

export type StoredTrendItem = {
  title: string;
  link: string;
  publishedAt: string;
  isUsed: boolean;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_FILE = join(process.cwd(), "data", "trends.json");

export class TrendStorageService {
  constructor() {
    this.ensureStorageFile();
  }

  public list(): StoredTrendItem[] {
    this.ensureStorageFile();
    try {
      const raw = readFileSync(STORAGE_FILE, "utf-8").trim();
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as StoredTrendItem[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch {
      return [];
    }
  }

  public save(items: StoredTrendItem[]): void {
    this.ensureStorageFile();
    writeFileSync(STORAGE_FILE, JSON.stringify(items, null, 2), "utf-8");
  }

  public checkDuplicate(title: string, items?: StoredTrendItem[]): boolean {
    const haystack = items ?? this.list();
    const normalized = this.normalizeTitle(title);
    return haystack.some((item) => this.normalizeTitle(item.title) === normalized);
  }

  public markUsed(title: string): boolean {
    const items = this.list();
    const normalized = this.normalizeTitle(title);
    const index = items.findIndex(
      (item) => this.normalizeTitle(item.title) === normalized
    );
    if (index === -1) {
      return false;
    }

    items[index] = {
      ...items[index],
      isUsed: true,
      updatedAt: new Date().toISOString(),
    };
    this.save(items);
    return true;
  }

  private ensureStorageFile(): void {
    const directory = dirname(STORAGE_FILE);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
    if (!existsSync(STORAGE_FILE)) {
      writeFileSync(STORAGE_FILE, "[]", "utf-8");
    }
  }

  private normalizeTitle(value: string): string {
    return value.trim().toLowerCase();
  }
}
