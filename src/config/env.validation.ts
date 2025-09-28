import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, IsUrl, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  REFRESH_TOKEN_PEPPER!: string;

  @IsString()
  MAIL_FROM!: string;

  @IsOptional()
  @IsString()
  MAIL_PROVIDER_API_KEY?: string; // fallback key name

  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;

  @IsUrl({ require_tld: false })
  WEB_URL!: string;

  @IsUrl({ require_tld: false })
  APP_URL!: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsString()
  FIREBASE_PROJECT_ID!: string;

  @IsString()
  FIREBASE_CLIENT_EMAIL!: string;

  @IsString()
  FIREBASE_PRIVATE_KEY!: string;

  @IsString()
  CLOUDINARY_CLOUD_NAME!: string;

  @IsString()
  CLOUDINARY_API_KEY!: string;

  @IsString()
  CLOUDINARY_API_SECRET!: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.toString()).join('\n'));
  }
  // Require at least one mail provider key
  if (!validated.RESEND_API_KEY && !validated.MAIL_PROVIDER_API_KEY) {
    throw new Error('RESEND_API_KEY or MAIL_PROVIDER_API_KEY must be set');
  }
  return validated;
}
