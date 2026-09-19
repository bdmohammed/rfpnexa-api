import path from 'node:path';

import dotenv from 'dotenv';
import { type RefinementCtx, z } from 'zod';

const nodeEnv = process.env['NODE_ENV'] ?? 'local';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${nodeEnv}`),
  override: true,
});

/**
 * Strict boolean transformer: accepts exact strings 'true' or 'false'.
 * Note: Requires exact lowercase 'true'/'false' in .env files (not '1'/'0'/'TRUE').
 */
const booleanEnv = z.enum(['true', 'false']).transform((value) => value === 'true');

export const isLocalEnv = () => env.NODE_ENV === 'local';
export const isDevEnv = () => env.NODE_ENV === 'dev';
export const isTestEnv = () => env.NODE_ENV === 'test';
export const isUatEnv = () => env.NODE_ENV === 'uat';
export const isProdEnv = () => env.NODE_ENV === 'prod';

// ─── Base Zod Schema ─────────────────────────────────────────────────────────

const trustProxyEnv = z
  .union([z.string(), z.number(), z.boolean()])
  .default(0)
  .transform((val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') return Number(val);
    return val;
  });

const baseEnvSchema = z.object({
  // App
  APP_NAME: z.string().min(1).default('rfpnexa'),
  NODE_ENV: z.enum(['local', 'dev', 'uat', 'prod', 'test']).default('local'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  TRUST_PROXY: trustProxyEnv,
  FRONTEND_CUSTOMER_URL: z.url(),
  FRONTEND_ADMIN_URL: z.url(),
  DOCKER: booleanEnv.default(false),

  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: booleanEnv.default(false),
  DATABASE_SSL_REJECT_UNAUTHORIZED: booleanEnv.default(false),
  /** Optional in prod when using system CA bundles / managed PG providers (RDS/Cloud SQL) */
  DATABASE_CA_CERT: z.string().optional(),
  DATABASE_SLOW_QUERY_THRESHOLD: z.coerce.number().int().min(0).default(1000),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_LOG_PARAMETERS: booleanEnv.default(false),

  // JWT & Session Security
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters'),
  JWT_ISSUER: z.string().default('rfpnexa-api'),
  JWT_AUDIENCE: z.string().default('rfpnexa-client'),
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(1).max(50).default(5),
  LOCKOUT_DURATION_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  CAPTCHA_REQUIRED_THRESHOLD: z.coerce.number().int().min(1).max(20).default(3),
  PASSWORD_RESET_MIN_INTERVAL_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),

  // Geolocation & Telemetry
  // GEOLOCATION_ENABLED: booleanEnv.default(true),
  // GEOLOCATION_PROVIDER: z.enum(['ipapi', 'disabled', 'local']).default('ipapi'),
  // GEOLOCATION_API_URL: z.string().default('https://ipapi.co/{ip}/json/'),
  // GEOLOCATION_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(2000),

  // PayPal
  PAYPAL_ENV: z.enum(['sandbox', 'prod']).default('sandbox'),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),

  // AWS S3
  /** Bucket is required for storage path construction; access keys are optional for IAM Role authentication */
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().min(1),

  // Email
  EMAIL_PROVIDER: z.enum(['ses', 'resend', 'dummy']).default('dummy'),
  FROM_EMAIL: z
    .email({
      error: 'Invalid email address',
    })
    .trim()
    .toLowerCase(),
  RFPNEXA_SYSTEM_ADMIN_EMAIL: z
    .email({
      error: 'Invalid email address',
    })
    .trim()
    .toLowerCase(),
  RESEND_API_KEY: z.string().optional(),

  // Features
  SWAGGER_ENABLED: booleanEnv.default(false),

  // PM2 instance ID
  NODE_APP_INSTANCE: z.string().optional(),

  // API URL
  API_URL: z.url().default('http://localhost:3000'),

  // OAuth & Security Credentials
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
});

type BaseEnvConfig = z.infer<typeof baseEnvSchema>;

// ─── Refinement Validation Helpers ──────────────────────────────────────────

/**
 * Validates production-specific database security policies and Swagger toggles.
 * Uses candidate `config.NODE_ENV` directly to avoid TDZ references to `isProdEnv()`.
 */
function validateProductionSecurity(config: BaseEnvConfig, ctx: RefinementCtx): void {
  if (config.NODE_ENV !== 'prod') return;

  if (!config.DATABASE_SSL) {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_SSL'],
      message: 'DATABASE_SSL must be enabled in production',
    });
  }

  if (!config.DATABASE_SSL_REJECT_UNAUTHORIZED) {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_SSL_REJECT_UNAUTHORIZED'],
      message: 'Database certificate verification must be enabled in production',
    });
  }

  if (config.SWAGGER_ENABLED) {
    ctx.addIssue({
      code: 'custom',
      path: ['SWAGGER_ENABLED'],
      message: 'Swagger must not be enabled in production',
    });
  }

  if (config.LOG_LEVEL === 'debug') {
    ctx.addIssue({
      code: 'custom',
      path: ['LOG_LEVEL'],
      message: 'Debug logging must not be enabled in production',
    });
  }

  if (config.DATABASE_LOG_PARAMETERS) {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_LOG_PARAMETERS'],
      message: 'Database parameter logging must be disabled in production',
    });
  }
}

/**
 * Validates production-specific payment processor secrets and webhooks.
 */
function validateProductionServices(config: BaseEnvConfig, ctx: RefinementCtx): void {
  if (config.NODE_ENV !== 'prod') return;

  const paypalKeys: Array<keyof BaseEnvConfig> = [
    'PAYPAL_CLIENT_ID',
    'PAYPAL_SECRET',
    'PAYPAL_WEBHOOK_ID',
  ];

  for (const key of paypalKeys) {
    if (!config[key]) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: `${key} is required in production`,
      });
    }
  }
}

/**
 * Validates email provider specific credential requirements.
 */
function validateEmailProvider(config: BaseEnvConfig, ctx: RefinementCtx): void {
  if (config.EMAIL_PROVIDER === 'resend' && !config.RESEND_API_KEY) {
    ctx.addIssue({
      code: 'custom',
      path: ['RESEND_API_KEY'],
      message: 'RESEND_API_KEY is required when EMAIL_PROVIDER=resend',
    });
  }
}

/**
 * Validates paired OAuth client ID and secret credentials.
 */
function validateOAuthKeyPair(
  clientId: string | undefined,
  clientSecret: string | undefined,
  provider: string,
  ctx: RefinementCtx,
): void {
  if (Boolean(clientId) !== Boolean(clientSecret)) {
    ctx.addIssue({
      code: 'custom',
      path: [`${provider.toUpperCase()}_CLIENT_ID`],
      message: `${provider} Client ID and Secret must be provided together`,
    });
  }
}

function validateAwsCredentials(config: BaseEnvConfig, ctx: RefinementCtx): void {
  const hasAccessKey = Boolean(config.AWS_ACCESS_KEY_ID);
  const hasSecretKey = Boolean(config.AWS_SECRET_ACCESS_KEY);

  if (hasAccessKey !== hasSecretKey) {
    ctx.addIssue({
      code: 'custom',
      path: ['AWS_ACCESS_KEY_ID'],
      message: 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be provided together',
    });
  }
}

/**
 * Validates trust proxy configuration to prevent ambiguous conflicting configurations.
 * Note: `TRUST_PROXY = 0` acts as the sentinel default when unspecified.
 */
function validateTrustProxyConfig(config: BaseEnvConfig, ctx: RefinementCtx): void {
  if (
    config.TRUST_PROXY_HOPS > 0 &&
    config.TRUST_PROXY !== 0 &&
    config.TRUST_PROXY !== config.TRUST_PROXY_HOPS
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['TRUST_PROXY'],
      message: 'Specify either TRUST_PROXY or TRUST_PROXY_HOPS, not both with conflicting values',
    });
  }
}

/**
 * Validates CAPTCHA Turnstile credentials in production when captcha threshold is active.
 * Note: Non-production environments gracefully fallback/no-op when TURNSTILE_SECRET_KEY is absent.
 */
function validateCaptchaConfig(config: BaseEnvConfig, ctx: RefinementCtx): void {
  if (config.NODE_ENV === 'prod' && !config.TURNSTILE_SECRET_KEY) {
    ctx.addIssue({
      code: 'custom',
      path: ['TURNSTILE_SECRET_KEY'],
      message: 'TURNSTILE_SECRET_KEY is required in production',
    });
  }
}

/**
 * Validates geolocation provider configuration alignment.
 */
function validateGeolocationConfig(config: BaseEnvConfig, ctx: RefinementCtx): void {
  if (config.GEOLOCATION_ENABLED && config.GEOLOCATION_PROVIDER === 'disabled') {
    ctx.addIssue({
      code: 'custom',
      path: ['GEOLOCATION_PROVIDER'],
      message: 'GEOLOCATION_PROVIDER cannot be "disabled" when GEOLOCATION_ENABLED is true',
    });
  }
}

// ─── SuperRefine Schema ───────────────────────────────────────────────────────

/**
 * [WHAT]
 * Refined environment schema enforcing security policies, payment keys, and OAuth pairs.
 *
 * [WHY]
 * Guarantees zero invalid configuration states before application startup.
 */
const envSchema = baseEnvSchema.superRefine((config, ctx) => {
  validateProductionSecurity(config, ctx);
  validateProductionServices(config, ctx);
  validateEmailProvider(config, ctx);
  validateTrustProxyConfig(config, ctx);
  validateCaptchaConfig(config, ctx);
  validateGeolocationConfig(config, ctx);

  validateOAuthKeyPair(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, 'GOOGLE', ctx);
  validateOAuthKeyPair(config.GITHUB_CLIENT_ID, config.GITHUB_CLIENT_SECRET, 'GITHUB', ctx);
  validateOAuthKeyPair(
    config.MICROSOFT_CLIENT_ID,
    config.MICROSOFT_CLIENT_SECRET,
    'MICROSOFT',
    ctx,
  );
  validateAwsCredentials(config, ctx);
});

export type AppEnv = z.infer<typeof envSchema>;

/**
 * [WHAT]
 * Prepares raw process.env key-values with container network host resolution for Docker.
 *
 * [WHY]
 * Adjusts localhost database URLs to container bridge hostnames when running in Docker.
 */
function buildRawEnvironment(): NodeJS.ProcessEnv {
  const raw = { ...process.env };

  if (raw['DOCKER'] !== 'true' || !raw['DATABASE_URL']) {
    return raw;
  }

  try {
    const databaseUrl = new URL(raw['DATABASE_URL']);

    databaseUrl.hostname = raw['NODE_ENV'] === 'local' ? 'db' : 'host.docker.internal';

    raw['DATABASE_URL'] = databaseUrl.toString();
  } catch {
    // Let Zod report the invalid DATABASE_URL.
  }

  return raw;
}

/**
 * [WHAT]
 * Validates system process environment against Zod schema.
 *
 * [WHY]
 * Fails fast at application boot time with detailed error reports if required variables are missing.
 *
 * [ERRORS]
 * Throws Error listing missing or invalid environment variables.
 */
function validateEnv(): AppEnv {
  const result = envSchema.safeParse(buildRawEnvironment());

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

export const env = validateEnv();
