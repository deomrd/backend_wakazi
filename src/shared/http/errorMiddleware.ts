import { ErrorRequestHandler, RequestHandler } from "express";
import { appConfig } from "../../config/env";
import { APP_MESSAGES } from "../errorMessages/errorMessages";
import { mapPrismaError } from "../errorMessages/prismaErrorMapper";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} non trouvée`,
    requestId: res.locals.requestId,
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;

  if (isMalformedJsonError(error)) {
    res.status(400).json({
      success: false,
      message: "Le format JSON de votre requête est invalide.",
      requestId: res.locals.requestId,
    });
    return;
  }

  const prismaError = mapPrismaError(error);
  if (prismaError) {
    res.status(prismaError.statusCode).json({
      success: false,
      message: prismaError.message,
      requestId: res.locals.requestId,
    });
    return;
  }

  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    requestId: res.locals.requestId,
    message: error instanceof Error ? error.message : String(error),
    ...(appConfig.nodeEnv === "production" ? {} : { stack: error instanceof Error ? error.stack : undefined }),
  }));
  res.status(500).json({
    success: false,
    message: appConfig.nodeEnv === "production" || !(error instanceof Error)
      ? APP_MESSAGES.GLOBAL.INTERNAL_ERROR
      : error.message,
    requestId: res.locals.requestId,
  });
};

function isMalformedJsonError(error: unknown): error is SyntaxError & { status: number; body: unknown } {
  return error instanceof SyntaxError
    && "status" in error
    && error.status === 400
    && "body" in error;
}
