import path from 'node:path';

import { DataSource } from 'typeorm';

import { TypeOrmPinoLogger } from './databaseLogger';
import { env } from './env';
import { SnakeNamingStrategy } from './namingStrategy';

import { RolePermission } from '@/database/entities/RolePermission';
// import { CountryVersion } from '@/database/entities/CountryVersion';
// import { StateVersion } from '@/database/entities/StateVersion';
// import { AlertPreference } from '@/entities/AlertPreference';
// import { AnalyticsAlert } from '@/entities/AnalyticsAlert';
// import { AnalyticsEvent } from '@/entities/AnalyticsEvent';
// import { AuditLog } from '@/entities/AuditLog';
// import { AuditRetentionPolicy } from '@/entities/AuditRetentionPolicy';
import { Category } from '@/entities/Category';
// import { CategoryActivity } from '@/entities/CategoryActivity';
// import { CategoryReview } from '@/entities/CategoryReview';
// import { CategoryReviewAssignment } from '@/entities/CategoryReviewAssignment';
// import { CategoryReviewComment } from '@/entities/CategoryReviewComment';
// import { CategoryVersion } from '@/entities/CategoryVersion';
import { Country } from '@/entities/Country';
// import { CountryActivity } from '@/entities/CountryActivity';
// import { CountryChangeRequest } from '@/entities/CountryChangeRequest';
// import { CountryChangeRequestAssignment } from '@/entities/CountryChangeRequestAssignment';
// import { CountryChangeRequestComment } from '@/entities/CountryChangeRequestComment';
// import { Coupon } from '@/entities/Coupon';
// import { DownloadHistory } from '@/entities/DownloadHistory';
// import { EmailToken } from '@/entities/EmailToken';
// import { EvaluationTemplate } from '@/entities/EvaluationTemplate';
// import { ExportJob } from '@/entities/ExportJob';
// import { FeatureCatalog } from '@/entities/FeatureCatalog';
// import { Notification } from '@/entities/Notification';
// import { NotificationAction } from '@/entities/NotificationAction';
// import { NotificationRecipient } from '@/entities/NotificationRecipient';
// import { PasswordHistory } from '@/entities/PasswordHistory';
import { Permission } from '@/entities/Permission';
import { PermissionModule } from '@/entities/PermissionModule';
import { Plan } from '@/entities/Plan';
// import { PlanCategoryPricing } from '@/entities/PlanCategoryPricing';
// import { PlanCountryPricing } from '@/entities/PlanCountryPricing';
// import { PlanFeature } from '@/entities/PlanFeature';
// import { PlanReview } from '@/entities/PlanReview';
// import { PlanReviewAssignment } from '@/entities/PlanReviewAssignment';
// import { PlanReviewComment } from '@/entities/PlanReviewComment';
// import { PlanVersion } from '@/entities/PlanVersion';
// import { PurchasedTender } from '@/entities/PurchasedTender';
import { Role } from '@/entities/Role';
// import { RoleActivity } from '@/entities/RoleActivity';
// import { RoleReview } from '@/entities/RoleReview';
// import { RoleReviewAssignment } from '@/entities/RoleReviewAssignment';
// import { RoleReviewComment } from '@/entities/RoleReviewComment';
// import { RoleVersion } from '@/entities/RoleVersion';
// import { RoleVersionPermission } from '@/entities/RoleVersionPermission';
// import { ScheduledReport } from '@/entities/ScheduledReport';
// import { ScheduledReportRecipient } from '@/entities/ScheduledReportRecipient';
// import { SecurityLog } from '@/entities/SecurityLog';
import { SeedHistory } from '@/entities/SeedHistory';
import { State } from '@/entities/State';
import { Subscription } from '@/entities/Subscription';
// import { SubscriptionDailyMetrics } from '@/entities/SubscriptionDailyMetrics';
// import { SubscriptionMigration } from '@/entities/SubscriptionMigration';
// import { SupportTicket } from '@/entities/SupportTicket';
// import { SupportTicketAttachment } from '@/entities/SupportTicketAttachment';
// import { SupportTicketMessage } from '@/entities/SupportTicketMessage';
import { Tender } from '@/entities/Tender';
// import { TenderAmendment } from '@/entities/TenderAmendment';
// import { TenderClarification } from '@/entities/TenderClarification';
// import { TenderCommittee } from '@/entities/TenderCommittee';
// import { TenderDailyMetrics } from '@/entities/TenderDailyMetrics';
import { TenderDocument } from '@/entities/TenderDocument';
// import { TenderEvaluation } from '@/entities/TenderEvaluation';
// import { TenderInvitation } from '@/entities/TenderInvitation';
// import { TenderParticipant } from '@/entities/TenderParticipant';
// import { TenderQuestion } from '@/entities/TenderQuestion';
// import { TenderReview } from '@/entities/TenderReview';
// import { TenderReviewAssignment } from '@/entities/TenderReviewAssignment';
// import { TenderReviewComment } from '@/entities/TenderReviewComment';
// import { TenderSubmission } from '@/entities/TenderSubmission';
// import { TenderTemplate } from '@/entities/TenderTemplate';
// import { TenderVersion } from '@/entities/TenderVersion';
// import { TenderWatcher } from '@/entities/TenderWatcher';
// import { TrafficDailyMetrics } from '@/entities/TrafficDailyMetrics';
import { Transaction } from '@/entities/Transaction';
import { User } from '@/entities/User';
// import { UserApprovalRequest } from '@/entities/UserApprovalRequest';
// import { UserDailyMetrics } from '@/entities/UserDailyMetrics';
// import { UserDashboardLayout } from '@/entities/UserDashboardLayout';
// import { UserDevice } from '@/entities/UserDevice';
// import { UserNote } from '@/entities/UserNote';
import { UserRole } from '@/entities/UserRole';
// import { UserSession } from '@/entities/UserSession';
import { WebhookEvent } from '@/entities/WebhookEvent';

/**
 * Resolves SSL configuration based on environment parameters and provider CA certificates.
 */
const getSslConfig = () => {
  if (!env.DATABASE_SSL) {
    return false;
  }

  return {
    rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED,
    ...(env.DATABASE_CA_CERT
      ? { ca: env.DATABASE_CA_CERT }
      : {}),
  };
};

/**
 * [WHAT]
 * Production TypeORM DataSource configuration for PostgreSQL database connections, entities, and migrations.
 *
 * [WHY]
 * Manages database connection pooling, naming strategies, migration paths, and logging integrations.
 *
 * [CONSTRAINT]
 * 1. `synchronize: false` MUST ALWAYS be enforced. Schema updates are handled exclusively via TypeORM migrations.
 * 2. `migrationsRun: false` MUST be kept false in multi-worker environments (PM2 cluster mode).
 *    Database migrations MUST be executed as an explicit deployment step (`npm run migration:run`) via CI/CD pipelines
 *    to prevent database lock contention, schema race conditions, and connection pool exhaustion across workers.
 * 3. `extra.max` controls per-worker pool size.
 *    Total DB connections = `worker_count × DATABASE_POOL_MAX + background_jobs`.
 * 4. `query_timeout` (5000ms) enforces defensive limits on HTTP request threads.
 *    Long-running queries (e.g. exports, reports)
 *    MUST execute out-of-band via background workers (`ExportJob`, `ScheduledReport`).
 *
 * [SIDE EFFECTS]
 * Initializes PostgreSQL connection pool upon `AppDataSource.initialize()`.
 *
 * [ERRORS]
 * Throws DataSource initialization errors if credentials, network connectivity, SSL verification, or schema paths fail.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  namingStrategy: new SnakeNamingStrategy(),
  url: env.DATABASE_URL,

  /** Schema modifications are strictly managed via migrations */
  synchronize: false,

  /**
   * Disabled in application runtime to prevent PM2 cluster worker race conditions.
   * Executed explicitly in deployment scripts (`npm run migration:run`).
   */
  migrationsRun: false,

  logging: ['error', 'warn', 'migration'],
  logger: new TypeOrmPinoLogger(),
  maxQueryExecutionTime: env.DATABASE_SLOW_QUERY_THRESHOLD,

  entities: [
    // AlertPreference,
    // AuditLog,
    Category,
    // CategoryReviewComment,
    // CategoryActivity,
    // CategoryReview,
    // CategoryReviewAssignment,
    // CategoryVersion,
    // DownloadHistory,
    // EmailToken,
    // Notification,
    Plan,
    // PurchasedTender,
    State,
    // StateVersion,
    Country,
    // CountryVersion,
    // CountryChangeRequest,
    // CountryChangeRequestAssignment,
    // CountryChangeRequestComment,
    // CountryActivity,
    Subscription,
    // SupportTicket,
    // SupportTicketMessage,
    // SupportTicketAttachment,
    Tender,
    // TenderVersion,
    TenderDocument,
    // TenderReview,
    // TenderReviewAssignment,
    // TenderReviewComment,
    // TenderCommittee,
    // TenderParticipant,
    // TenderEvaluation,
    // TenderWatcher,
    // TenderInvitation,
    // TenderTemplate,
    // TenderQuestion,
    // TenderClarification,
    // TenderAmendment,
    // EvaluationTemplate,
    // TenderSubmission,
    // PlanVersion,
    // FeatureCatalog,
    // PlanFeature,
    // PlanCountryPricing,
    // PlanCategoryPricing,
    // Coupon,
    // PlanReview,
    // PlanReviewAssignment,
    // PlanReviewComment,
    // SubscriptionMigration,
    Transaction,
    User,
    // UserApprovalRequest,
    // UserSession,
    WebhookEvent,
    // AuditRetentionPolicy,
    PermissionModule,
    Permission,
    Role,
    UserRole,
    RolePermission,
    // RoleVersion,
    // RoleVersionPermission,
    // RoleReview,
    // RoleReviewAssignment,
    // RoleReviewComment,
    // RoleActivity,
    // PasswordHistory,
    // UserDevice,
    // SecurityLog,
    // UserNote,
    // AnalyticsEvent,
    // UserDashboardLayout,
    // ExportJob,
    // AnalyticsAlert,
    // ScheduledReport,
    // ScheduledReportRecipient,
    // TenderDailyMetrics,
    // UserDailyMetrics,
    // SubscriptionDailyMetrics,
    // TrafficDailyMetrics,
    // NotificationRecipient,
    // NotificationAction,
    SeedHistory,
  ],

  migrations: [
    ['prod', 'uat'].includes(env.NODE_ENV)
      ? path.join(__dirname, '../database/migrations/*.js')
      : path.join(__dirname, '../database/migrations/*.ts'),
  ],

  /** Connection pooling and execution timeout safeguards */
  extra: {
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 3000,
    query_timeout: 5000,
    statement_timeout: 5000,
    idle_in_transaction_session_timeout: 10000,
  },

  ssl: getSslConfig(),
});
