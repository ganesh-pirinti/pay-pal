import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.string().default('4000').transform(val => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_ENVIRONMENT: z.enum(['sandbox', 'live']).default('sandbox'),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(val => parseInt(val, 10)),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('120').transform(val => parseInt(val, 10)),
  CACHE_TTL_MS: z.string().default('300000').transform(val => parseInt(val, 10)) // 5 minutes
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadAndValidateConfig(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('CRITICAL: Environment configuration validation failed:', parsed.error.issues);
    throw new Error('Invalid application environment configuration.');
  }

  // Enterprise Guard: Block live environment execution in hackathon / sandbox prototype
  if (parsed.data.PAYPAL_ENVIRONMENT === 'live') {
    throw new Error('FATAL SECURITY POLICY: Live PayPal environment is strictly blocked in TrustShield AI.');
  }

  return parsed.data;
}

export const APP_CONFIG = loadAndValidateConfig();
