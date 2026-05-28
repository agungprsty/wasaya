import pino from "pino";

export const waLogger = pino({
  level: process.env.NODE_ENV === "development" ? "warn" : "silent",
});
