import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Profile } from './profile.entity';

export type SocialPlatform =
  | 'youtube'
  | 'twitch'
  | 'twitter'
  | 'instagram'
  | 'tiktok'
  | 'discord'
  | 'github'
  | 'website';

@Entity('social_links')
@Unique(['profileId', 'platform'])
export class SocialLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  profileId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: [
      'youtube',
      'twitch',
      'twitter',
      'instagram',
      'tiktok',
      'discord',
      'github',
      'website',
    ],
  })
  platform!: SocialPlatform;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Profile, (profile) => profile.socialLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profileId' })
  profile?: Profile;
}
