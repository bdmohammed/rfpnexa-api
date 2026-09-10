import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AlertPreference } from './AlertPreference';
import { AnalyticsAlert } from './AnalyticsAlert';
import { AnalyticsEvent } from './AnalyticsEvent';
import { AuditLog } from './AuditLog';
import { AuditRetentionPolicy } from './AuditRetentionPolicy';
import { Category } from './Category';
import { Country } from './Country';
import { Coupon } from './Coupon';
import { DownloadHistory } from './DownloadHistory';
import { EmailToken } from './EmailToken';
import { EvaluationTemplate } from './EvaluationTemplate';
import { ExportJob } from './ExportJob';
import { FeatureCatalog } from './FeatureCatalog';
import { Notification } from './Notification';
import { NotificationRecipient } from './NotificationRecipient';
import { PasswordHistory } from './PasswordHistory';
import { Permission } from './Permission';
import { PermissionModule } from './PermissionModule';
import { PlanReviewAssignment } from './PlanReviewAssignment';
import { PlanVersion } from './PlanVersion';
import { Role } from './Role';
import { ScheduledReport } from './ScheduledReport';
import { State } from './State';
import { Subscription } from './Subscription';
import { SubscriptionDailyMetrics } from './SubscriptionDailyMetrics';
import { SupportTicket } from './SupportTicket';
import { SupportTicketMessage } from './SupportTicketMessage';
import { TenderDailyMetrics } from './TenderDailyMetrics';
import { Transaction } from './Transaction';
import { UserDailyMetrics } from './UserDailyMetrics';
import { UserDashboardLayout } from './UserDashboardLayout';
import { UserRole } from './UserRole';

import type { NotificationPreferences } from '@/types/types';
import type { Relation } from 'typeorm';
import { AccountType, UserStatus } from '@/types/enums';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  sms: false,
  marketing: false,
  security: true,
  tender: true,
  newsletter: false,
};

@Entity('users')
@Index(['email'])
@Index(['accountType'])
@Index(['accountType', 'status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ unique: true, type: 'varchar', length: 255 })
  email!: string;

  @Column({
    name: 'country_id',
    type: 'smallint',
  })
  countryId!: string;

  @ManyToOne(() => Country, (country) => country.users, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'country_id' })
  country!: Relation<Country>;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'account_type', type: 'enum', enum: AccountType, default: AccountType.USER })
  accountType!: AccountType;

  @Column({ name: 'company_name', type: 'varchar', length: 160 })
  companyName!: string;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ name: 'is_blocked', type: 'boolean', default: false })
  isBlocked!: boolean;

  @Index()
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING_EMAIL_VERIFICATION })
  status!: UserStatus;

  /**
   * Incremented on password change, email change, or account block.
   * JWT payload carries tokenVersion — mismatch = revoked session.
   */
  @Column({ name: 'token_version', type: 'int', default: 1 })
  tokenVersion!: number;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'lockout_until', type: 'timestamptz', nullable: true, default: null })
  lockoutUntil!: Date | null;

  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true, default: null })
  passwordChangedAt!: Date | null;

  @Column({ name: 'must_reset_password', type: 'boolean', default: false })
  mustResetPassword!: boolean;

  @Column({
    name: 'pending_email',
    type: 'varchar',
    unique: true,
    nullable: true,
    length: 255,
    default: null,
  })
  pendingEmail!: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true, length: 255, default: null })
  avatarUrl!: string | null;

  @Column({
    name: 'notification_preferences',
    type: 'jsonb',
    default: DEFAULT_NOTIFICATION_PREFERENCES,
  })
  notificationPreferences!: NotificationPreferences;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true, default: null })
  lastLoginAt!: Date | null;

  @Column({ name: 'email_changed_at', type: 'timestamptz', nullable: true, default: null })
  emailChangedAt!: Date | null;

  @Index()
  @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true, default: null })
  googleId!: string | null;

  @Index()
  @Column({ name: 'github_id', type: 'varchar', length: 255, nullable: true, default: null })
  githubId!: string | null;

  @Index()
  @Column({ name: 'microsoft_id', type: 'varchar', length: 255, nullable: true, default: null })
  microsoftId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true, default: null })
  deletedAt!: Date | null;

  // ─── Relations (no eager: true anywhere) ─────────────────────────────────
  @OneToMany(() => Subscription, (subscriptions) => subscriptions.user)
  subscriptions!: Relation<Subscription[]>;

  @OneToMany(() => Transaction, (transactions) => transactions.user)
  transactions!: Relation<Transaction[]>;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles!: Relation<UserRole[]>;

  @OneToMany(() => Role, (role) => role.createdByUser)
  rolesCreated!: Relation<Role[]>;

  @OneToMany(() => Role, (role) => role.updatedByUser)
  rolesUpdated!: Relation<Role[]>;

  @OneToMany(() => UserRole, (assignedRoles) => assignedRoles.assignedBy)
  assignedRoles!: Relation<UserRole[]>;

  @OneToMany(() => Country, (country) => country.createdBy)
  CountriesCreated!: Relation<Country[]>;

  @OneToMany(() => Country, (country) => country.updatedBy)
  CountriesUpdated!: Relation<Country[]>;

  @OneToMany(() => State, (state) => state.createdBy)
  StatesCreated!: Relation<State[]>;

  @OneToMany(() => State, (state) => state.updatedBy)
  StatesUpdated!: Relation<State[]>;

  @OneToMany(() => PermissionModule, (permissionModule) => permissionModule.createdBy)
  PermissionModulesCreated!: Relation<PermissionModule[]>;

  @OneToMany(() => PermissionModule, (permissionModule) => permissionModule.updatedBy)
  PermissionModulesUpdated!: Relation<PermissionModule[]>;

  @OneToMany(() => Permission, (permission) => permission.createdBy)
  PermissionsCreated!: Relation<Permission[]>;

  @OneToMany(() => Permission, (permission) => permission.updatedBy)
  PermissionsUpdated!: Relation<Permission[]>;

  @OneToMany(() => EmailToken, (emailToken) => emailToken.user)
  EmailTokensCreated!: Relation<EmailToken[]>;

  @OneToMany(() => PasswordHistory, (passwordHistory) => passwordHistory.user)
  PasswordHistoryCreated!: Relation<PasswordHistory[]>;

  @OneToMany(() => SupportTicket, (t) => t.user)
  supportTickets!: Relation<SupportTicket[]>;

  @OneToMany(() => SupportTicket, (t) => t.assignedTo)
  assignedTickets!: Relation<SupportTicket[]>;

  @OneToMany(() => SupportTicketMessage, (m) => m.sender)
  supportTicketMessages!: Relation<SupportTicketMessage[]>;

  @OneToOne(() => UserDashboardLayout, (userDashboardLayout) => userDashboardLayout.user)
  userDashboardLayout!: Relation<UserDashboardLayout | null>;

  @OneToMany(() => ScheduledReport, (report) => report.createdByUser)
  scheduledReports!: Relation<ScheduledReport[]>;

  @OneToMany(() => ExportJob, (job) => job.userId)
  exportJobs!: Relation<ExportJob[]>;

  @OneToMany(() => AuditRetentionPolicy, (policy) => policy.updatedBy)
  retentionPoliciesUpdated!: Relation<AuditRetentionPolicy[]>;

  @OneToMany(() => AuditRetentionPolicy, (policy) => policy.createdBy)
  retentionPoliciesCreated!: Relation<AuditRetentionPolicy[]>;

  @OneToMany(() => DownloadHistory, (downloadHistory) => downloadHistory.user)
  downloadHistory!: Relation<DownloadHistory[]>;

  @OneToMany(() => NotificationRecipient, (recipient) => recipient.user)
  receivedNotifications!: Relation<NotificationRecipient[]>;

  @OneToMany(() => Notification, (notification) => notification.senderUser)
  sentNotifications!: Relation<Notification[]>;

  @OneToMany(() => PlanVersion, (version) => version.lockedByUser)
  lockedPlanVersions!: Relation<PlanVersion[]>;

  @OneToMany(() => PlanVersion, (version) => version.createdByUser)
  createdPlanVersions!: Relation<PlanVersion[]>;

  @OneToMany(() => PlanVersion, (version) => version.updatedByUser)
  updatedPlanVersions!: Relation<PlanVersion[]>;

  @OneToMany(() => PlanVersion, (version) => version.approvedByUser)
  approvedPlanVersions!: Relation<PlanVersion[]>;

  @OneToMany(() => PlanReviewAssignment, (assignment) => assignment.reviewer)
  planReviewAssignments!: Relation<PlanReviewAssignment[]>;

  @OneToMany(() => Coupon, (coupon) => coupon.createdByUser)
  createdCoupons!: Relation<Coupon[]>;

  @OneToMany(() => Coupon, (coupon) => coupon.updatedByUser)
  updatedCoupons!: Relation<Coupon[]>;

  @OneToMany(() => AnalyticsEvent, (event) => event.actor)
  analyticsEvents!: Relation<AnalyticsEvent[]>;

  @OneToMany(() => AnalyticsAlert, (alert) => alert.resolvedByUser)
  resolvedAlerts!: Relation<AnalyticsAlert[]>;

  @OneToMany(() => AlertPreference, (alertPreference) => alertPreference.user)
  alertPreferences!: Relation<AlertPreference[]>;

  @OneToMany(() => EvaluationTemplate, (template) => template.createdByUser)
  createdEvaluationTemplates!: Relation<EvaluationTemplate[]>;

  @OneToMany(() => EvaluationTemplate, (template) => template.updatedByUser)
  updatedEvaluationTemplates!: Relation<EvaluationTemplate[]>;

  @OneToMany(() => FeatureCatalog, (fc) => fc.createdByUser)
  createdFeatureCatalogs!: Relation<FeatureCatalog[]>;

  @OneToMany(() => FeatureCatalog, (fc) => fc.updatedByUser)
  updatedFeatureCatalogs!: Relation<FeatureCatalog[]>;

  @OneToMany(() => AuditLog, (log) => log.actorUser)
  actorAuditLogs!: Relation<AuditLog[]>;

  @OneToMany(() => AuditLog, (log) => log.targetUser)
  targetAuditLogs!: Relation<AuditLog[]>;

  @OneToMany(() => TenderDailyMetrics, (metrics) => metrics.createdBy)
  createdTenderMetrics!: Relation<TenderDailyMetrics[]>;

  @OneToMany(() => TenderDailyMetrics, (metrics) => metrics.updatedBy)
  updatedTenderMetrics!: Relation<TenderDailyMetrics[]>;

  @OneToMany(() => UserDailyMetrics, (metrics) => metrics.createdBy)
  createdUserMetrics!: Relation<UserDailyMetrics[]>;

  @OneToMany(() => UserDailyMetrics, (metrics) => metrics.updatedBy)
  updatedUserMetrics!: Relation<UserDailyMetrics[]>;

  @OneToMany(() => SubscriptionDailyMetrics, (metrics) => metrics.createdBy)
  createdSubscriptionMetrics!: Relation<SubscriptionDailyMetrics[]>;

  @OneToMany(() => SubscriptionDailyMetrics, (metrics) => metrics.updatedBy)
  updatedSubscriptionMetrics!: Relation<SubscriptionDailyMetrics[]>;

  @OneToMany(() => Category, (category) => category.createdByUser)
  createdCategories!: Relation<Category[]>;

  @OneToMany(() => Category, (category) => category.updatedByUser)
  updatedCategories!: Relation<Category[]>;
}
