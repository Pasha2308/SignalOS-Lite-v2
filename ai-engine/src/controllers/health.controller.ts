import { Request, Response } from "express";
import { HealthService } from "../services/health.service";

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  public getHealth = (_req: Request, res: Response): void => {
    const payload = this.healthService.getHealth();
    res.status(200).json(payload);
  };
}
