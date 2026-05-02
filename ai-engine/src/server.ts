import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const app = createApp();

app.listen(env.port, () => {
  logger.info(
    `ai-engine service running on http://localhost:${env.port} (${env.nodeEnv})`
  );
});
