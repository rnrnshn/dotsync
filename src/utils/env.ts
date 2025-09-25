/**
 * Environment configuration and validation
 */

import { config } from 'dotenv';
import { z } from 'zod';
import { EnvironmentConfig } from '../types';

// Load environment variables
config();

/**
 * Environment schema for validation
 */
const envSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, 'Google API key is required'),
  GITHUB_TOKEN: z.string().min(1, 'GitHub token is required'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Parse and validate environment variables
 */
export function parseEnvironment(): EnvironmentConfig {
  try {
    const env = envSchema.parse(process.env);
    
    return {
      googleApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
      githubToken: env.GITHUB_TOKEN,
      nodeEnv: env.NODE_ENV,
      logLevel: env.LOG_LEVEL,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.'));
      throw new Error(
        `Missing or invalid environment variables: ${missingVars.join(', ')}\n` +
        'Please check your .env file or environment configuration.'
      );
    }
    throw error;
  }
}

/**
 * Get the current environment configuration
 */
export const env = parseEnvironment();

