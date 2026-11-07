import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from apps/api/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5001),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, {
    message: 'DATABASE_URL is required. Configure Supabase PostgreSQL connection string in apps/api/.env',
  }),

  CLERK_SECRET_KEY: z.string().min(1, {
    message: 'CLERK_SECRET_KEY is required. Obtain from Clerk Dashboard > API Keys',
  }),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, {
    message: 'CLERK_PUBLISHABLE_KEY is required. Obtain from Clerk Dashboard > API Keys',
  }),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  SUPABASE_URL: z.string().url({
    message: 'SUPABASE_URL must be a valid Supabase project URL (https://[ref].supabase.co)',
  }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: 'SUPABASE_SERVICE_ROLE_KEY is required for private backend storage operations',
  }),
  SUPABASE_STORAGE_BUCKET: z.string().default('trustvault-documents'),

  AI_API_KEY: z.string().optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.warn('\n================================================================');
    console.warn('⚠️  TRUSTVAULT ENVIRONMENT CONFIGURATION NOTICE');
    console.warn('================================================================');
    error.errors.forEach((err) => {
      console.warn(`- ${err.path.join('.')}: ${err.message}`);
    });
    console.warn('----------------------------------------------------------------');
    console.warn('Please configure the missing keys in apps/api/.env');
    console.warn('Refer to apps/api/.env.example for required variable formats.');
    console.warn('================================================================\n');
  }

  // Fallback defaults for testing or bootstrap mode
  parsedEnv = {
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    PORT: Number(process.env.PORT) || 5001,
    HOST: process.env.HOST || '0.0.0.0',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    DATABASE_URL: process.env.DATABASE_URL || '',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'trustvault-documents',
    AI_API_KEY: process.env.AI_API_KEY,
    BOOTSTRAP_ADMIN_EMAIL: process.env.BOOTSTRAP_ADMIN_EMAIL,
  };
}

export const env = parsedEnv;

