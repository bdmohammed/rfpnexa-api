import fs from 'node:fs';
import path from 'node:path';

import pino from 'pino';

import { env } from './env';

import { getContext } from '@/core/requestContext';

/**
 * [WHAT]
 * Application-wide Pino logger instance configured with environment-based log levels,
 * redaction rules, multi-target transports, and AsyncLocalStorage request context mixins.
 *
 * [WHY]
 * Provides structured JSON logging in production and colorized logs in development while guaranteeing
 * that sensitive data (passwords, tokens, cookies, secrets) is never leaked to log sinks.
 *
 * [CONSTRAINT]
 * 1. Must inject `requestId`, `traceId`, and `userId` from AsyncLocalStorage (`getContext()`) into log entries.
 * 2. Must enforce strict key redaction (`redact.paths`) with `[REDACTED]` censorship.
 * 3. Debug logging MUST NOT be enabled in non-development environments.
 *
 * [SIDE EFFECTS]
 * Creates local log files in `./logs/YYYY-MM-DD.log` when running in local development mode.
 */

const isDev = env.NODE_ENV === 'local' || env.NODE_ENV === 'dev';
const isTest = env.NODE_ENV === 'test';

/** Resolve application version from package.json with safe fallback */
let version = '0.0.0';

try {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    if (typeof packageJson.version === 'string') {
      // eslint-disable-next-line prefer-destructuring
      version = packageJson.version;
    }
  }
} catch {
  // Graceful fallback to default version if file reading fails
}

/** Determine log level based on environment safeguards */
const defaultLevel = isDev || isTest ? 'debug' : 'info';
const configuredLevel = env.LOG_LEVEL ?? defaultLevel;

// Guard against enabling debug-level logging in production environments
const level = !isDev && env.LOG_LEVEL === 'debug' ? 'info' : configuredLevel;

const logsDir = path.join(process.cwd(), 'logs');

if (isDev && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const todayDate = new Date().toISOString().slice(0, 10);
const logFilePath = path.join(logsDir, `${todayDate}.log`);

/** Transports configuration: pretty console and file transport for dev, stdout JSON for prod */
const transport = isDev
  ? pino.transport({
      targets: [
        {
          target: 'pino-pretty',
          level,
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
        {
          target: 'pino/file',
          level,
          options: {
            destination: logFilePath,
            mkdir: true,
          },
        },
      ],
    })
  : undefined;

/**
 * Global Pino logger instance.
 */
export const logger = pino(
  {
    level,
    messageKey: 'message',
    mixin() {
      const context = getContext();
      return context
        ? {
            requestId: context.requestId,
            traceId: context.traceId,
            userId: context.userId,
          }
        : {};
    },
    base: {
      service: env.APP_NAME,
      version,
      env: env.NODE_ENV,
    },
    redact: {
      paths: [
        'password',
        'confirmPassword',
        'token',
        'accessToken',
        'refreshToken',
        'authorization',
        'cookie',
        'apiKey',
        'clientSecret',
        'webhookSecret',

        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'req.headers["set-cookie"]',

        'req.body.password',
        'req.body.confirmPassword',
        'req.body.token',
        'req.body.refreshToken',
        'req.body.accessToken',
        'req.body.creditCard',
        'req.body.cvv',
        'req.body.paypalClientSecret',
        'req.body.paypalWebhookSecret',

        '*.paypalSecret',
        '*.paypalPassword',
        '*.webhookSecret',
        '*.apiKey',
        '*.secret',
        '*.clientSecret',
      ],
      censor: '[REDACTED]',
    },
    ...(!isDev
      ? {
          formatters: {
            level(label) {
              return { level: label };
            },
          },
          timestamp: pino.stdTimeFunctions.isoTime,
        }
      : {}),
  },
  transport,
);
