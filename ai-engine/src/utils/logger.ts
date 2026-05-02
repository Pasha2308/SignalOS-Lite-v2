const isDev = (): boolean => process.env.NODE_ENV === "development";

export const logger = {
  info: (message: string): void => {
    console.log(`[INFO] ${message}`);
  },
  error: (message: string): void => {
    console.error(`[ERROR] ${message}`);
  },
  /** Verbose traces (e.g. raw LLM output). Development only. */
  debug: (message: string): void => {
    if (isDev()) {
      console.log(`[DEBUG] ${message}`);
    }
  },
};
