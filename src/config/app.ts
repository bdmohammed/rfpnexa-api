import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { AppDataSource } from './database';
import { env } from './env';
import { logger } from './logger';
import { registerSwagger } from './swagger';

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { doubleCsrfProtection } from '@/middleware/csrf';
import { errorHandler } from '@/middleware/errorHandler';
import { globalLimiter } from '@/middleware/rateLimits';
import { requestLogger } from '@/middleware/requestLogger';
import { traceContext } from '@/middleware/traceContext';
import { adminRouter } from '@/modules/admin/admin.routes';
import { analyticsRouter } from '@/modules/analytics/analytics.routes';
import { auditRouter } from '@/modules/audit/audit.routes';
import { authRouter } from '@/modules/auth/auth.routes';
import { categoriesRouter } from '@/modules/categories/categories.routes';
import { countriesRouter } from '@/modules/countries/countries.routes';
import { dashboardRouter } from '@/modules/dashboard/dashboard.routes';
import { notificationsRouter } from '@/modules/notifications/notifications.routes';
import { profileRouter } from '@/modules/profile/profile.routes';
import rbacRouter from '@/modules/rbac/rbac.routes';
import { plansRouter } from '@/modules/subscriptions/plans.routes';
import { subscriptionsRouter } from '@/modules/subscriptions/subscriptions.routes';
import { supportRouter } from '@/modules/support/support.routes';
import { tendersRouter } from '@/modules/tenders/tenders.routes';
import { webhooksRouter } from '@/modules/webhooks/webhooks.routes';

const allowedOrigins = new Set([env.FRONTEND_CUSTOMER_URL, env.FRONTEND_ADMIN_URL]);

const app = express();

/**
 * Executes a database connectivity check with a forced 2000ms timeout limit.
 */
async function checkDatabaseConnectivity(timeoutMs = 2000): Promise<boolean> {
  if (!AppDataSource.isInitialized) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await AppDataSource.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Trust proxy (MUST be before rate limiter so req.ip resolves client IP) ───
app.set('trust proxy', env.TRUST_PROXY ?? env.TRUST_PROXY_HOPS);

// ── Trace Context (MUST be first) ─────────────────────────────────────────────
app.use(traceContext);

// ── HTTP request logging (MUST be second) ─────────────────────────────────────
app.use(requestLogger);

// ── Security headers ──────────────────────────────────────────────────────────
// @ts-ignore - helmet types are not compatible with the config we are using
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  }) as unknown as RequestHandler,
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isLocalhost =
        env.NODE_ENV === 'local' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (allowedOrigins.has(origin) || isLocalhost) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-csrf-token', 'X-Trace-Id', 'traceparent'],
  }) as unknown as RequestHandler,
);

// ── Fast Health Checks (Placed before body parsing & compression) ─────────────

/**
 * @swagger
 * /api/v1/health/live:
 *   get:
 *     summary: System liveness check (Public)
 *     description: Verifies that the Node.js process is alive without performing application or database I/O.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Node.js process is alive
 */
app.get('/api/v1/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * @swagger
 * /api/v1/health/ready:
 *   get:
 *     summary: System readiness check (Public)
 *     description: Verifies PostgreSQL database connectivity with a 2000ms forced query timeout.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Database is connected and system is ready
 *       503:
 *         description: Database connection is offline or degraded
 */
app.get('/api/v1/health/ready', async (_req: Request, res: Response) => {
  const dbOk = await checkDatabaseConnectivity(2000);

  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: System health check (Public)
 *     description: Verifies database connectivity and returns system status, uptime, and version.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Database is connected and system is healthy
 *       503:
 *         description: Database connection is offline or degraded
 */
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  const dbOk = await checkDatabaseConnectivity(2000);

  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env['npm_package_version'] ?? '1.0.0',
  });
});

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }) as unknown as RequestHandler);
app.use(express.urlencoded({ extended: true, limit: '10kb' }) as unknown as RequestHandler);

// ── Cookie parsing ────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Global rate limit ─────────────────────────────────────────────────────────
app.use('/api/', globalLimiter);

// ── Swagger UI (local + dev only) ────────────────────────────────────────────
if (env.SWAGGER_ENABLED) {
  registerSwagger(app);
  logger.info('Swagger UI available at /api/v1/docs');
}

// ── Dummy S3 Upload/Download (Local & Dev Only) ───────────────────────────────
if (['local', 'dev'].includes(env.NODE_ENV)) {
  app.put('/dummy-s3-upload/*splat', (_req: Request, res: Response) => {
    res.status(200).send('OK');
  });
  app.get('/dummy-s3-download/*splat', (_req: Request, res: Response) => {
    res.status(200).send('Dummy File Content');
  });
}

// ── Webhooks (Bypasses CSRF & JWT, relies strictly on signature verification) ──
app.use('/api/v1/webhooks', webhooksRouter);

// ── CSRF protection (Skipped in 'local' env; active in dev, uat, prod) ────────
const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (env.NODE_ENV === 'local' || env.NODE_ENV === 'test') return next();
  doubleCsrfProtection(req, res, next);
};

app.use(csrfProtection);

// ── Protected API Routes ──────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tenders', tendersRouter);
app.use('/api/v1/subscriptions', subscriptionsRouter);
app.use('/api/v1/plans', plansRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/geography', countriesRouter);
app.use('/api/v1/support', supportRouter);
app.use('/api/v1/rbac', rbacRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/notifications', notificationsRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, code: 'ROUTE_NOT_FOUND', message: 'Route not found' });
});

// ── Global error handler (MUST be last) ──────────────────────────────────────
app.use(errorHandler);

export { app };
