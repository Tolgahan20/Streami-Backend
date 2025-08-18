import { EmailVerificationToken } from '../../tokens/entities/email-verification-token.entity';
import { RefreshToken } from '../../tokens/entities/refresh-token.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'citext', unique: true })
  email!: string;

  @Column({ type: 'text' })
  passwordHash!: string;

  @Column({ type: 'text', nullable: true })
  displayName?: string;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'text', default: 'USER' })
  role!: 'USER' | 'ADMIN';

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(
    () => EmailVerificationToken,
    (t: EmailVerificationToken) => t.user,
  )
  verificationTokens!: EmailVerificationToken[];

  @OneToMany(() => RefreshToken, (t: RefreshToken) => t.user)
  refreshTokens!: RefreshToken[];
}
