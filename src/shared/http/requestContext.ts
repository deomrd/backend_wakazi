import { randomUUID } from "node:crypto";
import { RequestHandler } from "express";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export const requestContext: RequestHandler = (req, res, next) => {
  const provided = req.header("x-request-id");
  const requestId = provided && REQUEST_ID_PATTERN.test(provided) ? provided : randomUUID();
  const startedAt = process.hrtime.bigint();
  const requestPath = req.path;

  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: requestPath,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    }));
  });

  next();
};

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  next();
};
