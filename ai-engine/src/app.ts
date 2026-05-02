import express, { Application } from "express";
import { apiRouter } from "./routes";

export const createApp = (): Application => {
  const app = express();

  app.use(express.json());
  app.use("/", apiRouter);

  return app;
};
