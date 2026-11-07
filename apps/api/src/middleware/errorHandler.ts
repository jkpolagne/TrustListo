import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiErrorBody } from '@trustlisto/shared';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../env';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

// Out-of-scope records return 404, never 403, so their existence isn't leaked (SPEC §5.3).
export const notFoundError = () => new HttpError(404, 'NOT_FOUND', 'Not found');
export const forbiddenError = () => new HttpError(403, 'FORBIDDEN', "Your role can't do this.");

const body = (code: string, message: string, details?: unknown): ApiErrorBody => ({
  error: details === undefined ? { code, message } : { code, message, details },
});

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json(body('NOT_FOUND', 'Not found'));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json(body('VALIDATION_FAILED', 'Some fields are invalid.', err.issues));
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json(body(err.code, err.message, err.details));
    return;
  }
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    res
      .status(400)
      .json(
        body(
          tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_FAILED',
          tooBig ? `Files can be up to ${env.UPLOAD_MAX_MB} MB.` : 'The upload could not be read.',
        ),
      );
    return;
  }
  console.error(err);
  res.status(500).json(body('INTERNAL', 'Something went wrong on the server.'));
};
