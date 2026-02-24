import { z } from 'zod';

const envSchema = z.object({
  // Supabase (trim evita %0D%0A em keys coladas com quebra de linha)
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1, 'Supabase anon key is required'),
  
  // News API (Opcional)
  NEXT_PUBLIC_NEWS_API_KEY: z.string().optional(),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

type Env = z.infer<typeof envSchema>;

const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '',
  NEXT_PUBLIC_NEWS_API_KEY: process.env.NEXT_PUBLIC_NEWS_API_KEY,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

const parsed = envSchema.safeParse(raw);

/** true se NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidos e válidos */
export const envValid = parsed.success;

// Export validated environment variables (ou defaults para não quebrar o app no cliente)
export const env: Env = parsed.success
  ? parsed.data
  : {
      NEXT_PUBLIC_SUPABASE_URL: raw.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: raw.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
      NEXT_PUBLIC_NEWS_API_KEY: raw.NEXT_PUBLIC_NEWS_API_KEY,
      NODE_ENV: (raw.NODE_ENV as Env['NODE_ENV']) || 'development',
    };

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
