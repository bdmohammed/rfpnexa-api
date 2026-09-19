// import {
//   Column,
//   CreateDateColumn,
//   Entity,
//   Index,
//   JoinColumn,
//   ManyToOne,
//   PrimaryGeneratedColumn,
//   UpdateDateColumn,
// } from 'typeorm';

// import { User } from './User';

// import type { CategoryReview } from './CategoryReview';
// import type { Relation } from 'typeorm';
// import { ReviewAction } from '@/types/enums';

// @Entity('category_review_comments')
// @Index(['categoryReviewId'])
// export class CategoryReviewComment {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column({ name: 'category_review_id', type: 'uuid' })
//   categoryReviewId!: string;

//   @ManyToOne('CategoryReview', 'comments', { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'category_review_id' })
//   categoryReview!: Relation<CategoryReview>;

//   @Column({ name: 'user_id', type: 'uuid' })
//   userId!: string;

//   @ManyToOne(() => User, { onDelete: 'RESTRICT' })
//   @JoinColumn({ name: 'user_id' })
//   user!: Relation<User>;

//   @Column({ type: 'text' })
//   comment!: string;

//   @Column({ type: 'enum', enum: ReviewAction, default: ReviewAction.SUBMIT })
//   action!: ReviewAction;

//   @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
//   createdAt!: Date;

//   @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
//   updatedAt!: Date;
// }
