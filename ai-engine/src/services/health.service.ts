export type HealthResponse = {
  status: "ok";
  service: string;
  uptimeSeconds: number;
  timestamp: string;
};

export class HealthService {
  public getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "ai-engine",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
