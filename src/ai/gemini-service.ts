/**
 * Google Gemini AI service for configuration analysis
 */

import { generateObject, generateText } from 'ai';
import { google, GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { z } from 'zod';
import { ConfigAnalysis, DotfileConfig, Result } from '../types';
import { AI_PROMPTS } from '../types/constants';
import { env } from '../utils/env';

/**
 * Schema for AI analysis response
 */
const ConfigAnalysisSchema = z.object({
  description: z.string().describe('Brief description of what this configuration does'),
  category: z.enum(['shell', 'editor', 'git', 'system', 'development', 'productivity'])
    .describe('Category this configuration belongs to'),
  requiredPackages: z.array(z.string()).describe('Required packages or dependencies'),
  setupInstructions: z.string().describe('Setup instructions for a new machine'),
  hasIssues: z.boolean().describe('Whether this configuration has any issues'),
  issues: z.array(z.string()).describe('List of issues or warnings'),
  confidence: z.number().min(0).max(1).describe('Confidence score for the analysis (0-1)'),
});

export class GeminiService {
  private readonly model: any;

  constructor() {
    // Validate API key before initializing the model
    if (!env.googleApiKey || env.googleApiKey.trim() === '') {
      throw new Error(
        'Google API key is missing or empty. Please set GOOGLE_GENERATIVE_AI_API_KEY in your environment variables or .env file.'
      );
    }

    // Set the API key as an environment variable for the Google AI SDK
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = env.googleApiKey;

    this.model = google('gemini-1.5-flash');
  }

  /**
   * Analyze a configuration file using AI
   */
  async analyzeConfig(config: DotfileConfig): Promise<Result<ConfigAnalysis, Error>> {
    try {
      const prompt = AI_PROMPTS.ANALYZE_CONFIG
        .replace('{filename}', config.path)
        .replace('{content}', config.content);

      const result = await generateObject({
        model: this.model,
        prompt,
        schema: ConfigAnalysisSchema,
        temperature: 0.1, // Low temperature for consistent analysis
      });

      const analysis: ConfigAnalysis = {
        description: result.object.description,
        category: result.object.category,
        requiredPackages: result.object.requiredPackages,
        setupInstructions: result.object.setupInstructions,
        hasIssues: result.object.hasIssues,
        issues: result.object.issues,
        confidence: result.object.confidence,
      };

      return { success: true, data: analysis };
    } catch (error) {
      return {
        success: false,
        error: new Error(`AI analysis failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Generate setup script for a configuration
   */
  async generateSetupScript(
    config: DotfileConfig,
    dependencies: string[]
  ): Promise<Result<string, Error>> {
    try {
      const prompt = AI_PROMPTS.GENERATE_SETUP_SCRIPT
        .replace('{config}', JSON.stringify(config, null, 2))
        .replace('{dependencies}', dependencies.join(', '));

      const result = await generateText({
        model: this.model,
        prompt,
        temperature: 0.2,
      });

      return { success: true, data: result.text };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Setup script generation failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Explain a configuration in simple terms
   */
  async explainConfig(config: DotfileConfig): Promise<Result<string, Error>> {
    try {
      const prompt = AI_PROMPTS.EXPLAIN_CONFIG
        .replace('{filename}', config.path)
        .replace('{content}', config.content);

      const result = await generateText({
        model: this.model,
        prompt,
        temperature: 0.3,
      });

      return { success: true, data: result.text };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Config explanation failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Analyze multiple configurations and provide recommendations
   */
  async analyzeMultipleConfigs(configs: DotfileConfig[]): Promise<Result<{
    recommendations: string[];
    conflicts: string[];
    improvements: string[];
  }, Error>> {
    try {
      const configSummary = configs.map(config => ({
        path: config.path,
        type: config.type,
        size: config.size,
        hasAI: !!config.aiAnalysis,
      }));

      const prompt = `
        Analyze these dotfile configurations and provide recommendations:
        
        Configurations: ${JSON.stringify(configSummary, null, 2)}
        
        Please provide:
        1. General recommendations for improving the setup
        2. Potential conflicts between configurations
        3. Suggested improvements or optimizations
        
        Respond in JSON format:
        {
          recommendations: [string],
          conflicts: [string],
          improvements: [string]
        }
      `;

      const result = await generateObject({
        model: this.model,
        prompt,
        schema: z.object({
          recommendations: z.array(z.string()),
          conflicts: z.array(z.string()),
          improvements: z.array(z.string()),
        }),
        temperature: 0.2,
      });

      return { success: true, data: result.object };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Multi-config analysis failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Generate documentation for a configuration
   */
  async generateDocumentation(config: DotfileConfig): Promise<Result<string, Error>> {
    try {
      const prompt = AI_PROMPTS.GENERATE_DOCUMENTATION
        .replace('{filePath}', config.path)
        .replace('{type}', config.type)
        .replace('{content}', config.content);

      const result = await generateText({
        model: this.model,
        prompt,
        temperature: 0.3,
      });

      return { success: true, data: result.text };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Documentation generation failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Check if AI service is available and working
   */
  async healthCheck(): Promise<Result<boolean, Error>> {
    try {
      const result = await generateText({
        model: this.model,
        prompt: 'Say "AI service is working" if you can read this.',
        temperature: 0,
      });

      return { success: true, data: result.text.includes('AI service is working') };
    } catch (error) {
      return {
        success: false,
        error: new Error(`AI service health check failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }
}
