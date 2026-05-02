import { Router } from "express";
import { healthRouter } from "./health.routes";
import { contentRouter } from "./content.routes";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/", contentRouter);

export { apiRouter };
