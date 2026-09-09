import type { Server } from 'node:http';
import type { Socket } from 'node:net';
import { performance } from 'node:perf_hooks';

import { app } from './app';
import { AppDataSource } from './database';
import { env } from './env';
import { logger } from './logger';

import { startCronJobs, stopCronJobs } from '@/jobs';
import { dashboardPublisher } from '@/modules/dashboard/services/publisher.service';
import {
  setupNotificationListeners,
  stopNotificationListeners,
} from '@/modules/notifications/notifications.service';

import 'reflect-metadata';

const startTime = performance.now();

const SHUTDOWN_TIMEOUT_MS = 10_000;

/** Guard flag preventing duplicate shutdown invocations */
let isShuttingDown = false;
let httpServer: Server | undefined;
const activeSockets = new Set<Socket>();

// ─── HTTP Server Lifecycle ───────────────────────────────────────────────────

/**
 * [WHAT]
 * Starts HTTP server, tracks active network sockets, and handles port binding errors.
 */
async function startHttpServer(): Promise<void> {
  const port = env.PORT;

  await new Promise<void>((resolve, reject) => {
    httpServer = app.listen(port);

    httpServer.requestTimeout = 30_000;
    httpServer.headersTimeout = 10_000;
    httpServer.keepAliveTimeout = 5_000;
    // Track active connection sockets for forced termination upon shutdown timeout
    httpServer.on('connection', (socket: Socket) => {
      activeSockets.add(socket);
      socket.on('close', () => {
        activeSockets.delete(socket);
      });
    });

    httpServer.once('listening', () => {
      logger.info({ port }, 'HTTP server ready and listening for incoming connections');

      resolve();
    });

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      logger.fatal(
        {
          err,
          port,
          code: err.code,
        },
        err.code === 'EADDRINUSE'
          ? 'HTTP server failed: port already in use'
          : 'HTTP server failed to start',
      );
      reject(err);
    });
  });
}

/**
 * [WHAT]
 * Stops HTTP server from accepting new traffic and forces socket destruction if timeout expires.
 */
async function stopHttpServer(): Promise<void> {
  if (!httpServer) return;

  await new Promise<void>((resolve) => {
    let settled = false;

    const complete = (): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(forceTimer);
      resolve();
    };

    const forceTimer = setTimeout(() => {
      logger.warn(
        { activeConnections: activeSockets.size, timeoutMs: SHUTDOWN_TIMEOUT_MS },
        'HTTP shutdown timeout reached; forcing socket closure',
      );

      for (const socket of activeSockets) {
        socket.destroy();
      }
      complete();
    }, SHUTDOWN_TIMEOUT_MS);

    httpServer?.close((err) => {
      clearTimeout(forceTimer);
      if (err) {
        logger.error(
          {
            err,
          },
          'HTTP server close completed with error',
        );
      } else {
        logger.info('HTTP server closed');
      }
      complete();
    });
  });

  httpServer = undefined;
}

// ─── Database & Services Lifecycle ────────────────────────────────────────────

/** Initializes TypeORM PostgreSQL database connection pool */
async function initializeDatabase(): Promise<void> {
  await AppDataSource.initialize();
  logger.info('Database connection pool initialized');
}

/** Destroys TypeORM PostgreSQL database connection pool */
async function destroyDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('Database connection pool destroyed');
  }
}

/** Starts background cron jobs on primary PM2 cluster instance */
function initializeCron(): void {
  const instanceId = env.NODE_APP_INSTANCE;
  if (instanceId === '0' || instanceId === undefined) {
    startCronJobs();
    logger.info({ instanceId: instanceId ?? 'standalone' }, 'Cron jobs started on this worker');
  } else {
    logger.info({ instanceId }, 'Cron skipped — non-primary PM2 cluster worker');
  }
}

// ─── Graceful Shutdown Orchestration ──────────────────────────────────────────

/**
 * [WHAT]
 * Executes structured, graceful application shutdown in response to OS signals or fatal exceptions.
 *
 * [WHY]
 * Guarantees zero dropped requests, closes database connections cleanly, and stops background jobs.
 *
 * [CONSTRAINT]
 * Shutdown sequence MUST strictly follow:
 * 1. Stop HTTP server & drain active request sockets (`stopHttpServer()`)
 * 2. Stop background cron jobs (`stopCronJobs()`)
 * 3. Stop real-time notification listeners (`stopNotificationListeners()`)
 * 4. Destroy PostgreSQL database connection pool (`destroyDatabase()`)
 * 5. Terminate process with appropriate exit code
 */
async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) {
    logger.warn({ signal }, 'Shutdown already in progress — ignoring duplicate signal');
    return;
  }
  isShuttingDown = true;

  const durationMs = performance.now() - startTime;
  logger.info({ reason: signal, durationMs }, 'Application graceful shutdown initiated');

  // Step 1: Stop HTTP server and force close remaining sockets on timeout
  try {
    await stopHttpServer();
  } catch (err) {
    logger.error({ err }, 'Failed to stop HTTP server cleanly');
  }

  // Step 2: Stop scheduled cron jobs
  try {
    stopCronJobs();
    logger.info('Background cron jobs stopped');
  } catch (err) {
    logger.error({ err }, 'Failed to stop cron jobs');
  }

  // Step 3: Stop notification event listeners and SSE connections
  try {
    stopNotificationListeners();
    dashboardPublisher.shutdown();
    logger.info('Notification listeners and dashboard SSE publisher stopped');
  } catch (err) {
    logger.error({ err }, 'Failed to stop notification listeners or dashboard publisher');
  }

  // Step 4: Destroy database connection pool
  try {
    await destroyDatabase();
    logger.info('Database connection pool destroyed');
  } catch (err) {
    logger.error({ err }, 'Failed to close database connection pool');
  }

  logger.info({ exitCode }, 'Application shutdown complete');
  process.exit(exitCode);
}

// ─── Process Signal & Exception Handlers ─────────────────────────────────────

process.on('SIGTERM', () => {
  void shutdown('SIGTERM', 0);
});

process.on('SIGINT', () => {
  void shutdown('SIGINT', 0);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — initiating emergency shutdown');
  void shutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.fatal({ err: error }, 'Unhandled promise rejection — initiating emergency shutdown');
  void shutdown('unhandledRejection', 1);
});

// ─── Main Bootstrap ──────────────────────────────────────────────────────────

/**
 * [WHAT]
 * Application bootstrap function orchestrating database, listeners, cron, and HTTP server startup.
 */
async function bootstrap(): Promise<void> {
  logger.info(
    {
      env: env.NODE_ENV,
      port: env.PORT,
      nodeVersion: process.version,
    },
    'Application starting',
  );

  try {
    await initializeDatabase();
    setupNotificationListeners();
    initializeCron();
    await startHttpServer();
  } catch (err) {
    logger.fatal({ err }, 'Application initialization failed — initiating shutdown');
    await shutdown('bootstrap-failure', 1);
  }
}

void bootstrap();
