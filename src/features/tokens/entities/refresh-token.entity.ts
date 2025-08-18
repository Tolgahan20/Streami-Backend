import { User } from '../../users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'refresh_token' })
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (u) => u.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'text', unique: true })
  tokenHash!: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress?: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
