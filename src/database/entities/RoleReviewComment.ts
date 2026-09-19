// import {
//   Column,
//   CreateDateColumn,
//   Entity,
//   Index,
//   JoinColumn,
//   ManyToOne,
//   PrimaryGeneratedColumn,
// } from 'typeorm';

// import { RoleReview } from './RoleReview';
// import { User } from './User';

// import type { Relation } from 'typeorm';
// import { ReviewAction } from '@/types/enums';

// @Entity('role_review_comments')
// @Index('idx_role_review_comments_review_id', ['reviewId', 'createdAt'])
// export class RoleReviewComment {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column({ name: 'review_id', type: 'uuid' })
//   reviewId!: string;

//   @ManyToOne(() => RoleReview, (roleReview) => roleReview.roleReviewComments, {
//     onDelete: 'CASCADE',
//   })
//   @JoinColumn({ name: 'review_id' })
//   roleReview!: Relation<RoleReview>;

//   @Column({ name: 'user_id', type: 'uuid', nullable: true })
//   userId!: string | null;

//   @ManyToOne(() => User, { onDelete: 'RESTRICT' })
//   @JoinColumn({ name: 'user_id' })
//   user!: Relation<User>;

//   @Column({ type: 'enum', enum: ReviewAction })
//   action!: ReviewAction;

//   @Column({ type: 'text' })
//   comment!: string;

//   @Column({ name: 'is_internal', type: 'boolean', default: false })
//   isInternal!: boolean;

//   @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
//   editedAt!: Date | null;

//   @Column({ name: 'parent_comment_id', type: 'uuid', nullable: true })
//   parentCommentId!: string | null;

//   @ManyToOne(() => RoleReviewComment, { onDelete: 'SET NULL', nullable: true })
//   @JoinColumn({ name: 'parent_comment_id' })
//   parentComment!: Relation<RoleReviewComment | null>;

//   @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
//   createdAt!: Date;
// }
