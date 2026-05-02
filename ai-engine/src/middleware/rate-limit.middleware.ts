import { Request, Response, NextFunction } from "express";

type Bucket = {
  count: number;
  startedAt: number;
};

const buckets = new Map<string, Bucket>();

export const endpointRateLimit = (
  endpointKey: string,
  maxRequests = 5,
  windowMs = 60_000
) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const current = buckets.get(endpointKey);

    if (!current || now - current.startedAt >= windowMs) {
      buckets.set(endpointKey, { count: 1, startedAt: now });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      res.status(429).json({
        error: "Rate limit exceeded. Try again in a minute.",
      });
      return;
    }

    current.count += 1;
    buckets.set(endpointKey, current);
    next();
  };
};
