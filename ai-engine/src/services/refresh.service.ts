export type StoredContentItem = {
  content: string;
  createdAt: Date;
};

export class RefreshService {
  private readonly memoryStore: StoredContentItem[] = [];

  public save(content: string): void {
    this.memoryStore.push({
      content,
      createdAt: new Date(),
    });
  }

  public list(): StoredContentItem[] {
    return [...this.memoryStore];
  }
}
