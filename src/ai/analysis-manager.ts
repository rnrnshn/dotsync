/**
 * AI analysis manager for coordinating configuration analysis
 */

import { DotfileConfig, Result } from '../types';
import { GeminiService } from './gemini-service';
import { ParserFactory } from '../parsers/parser-factory';

export class AnalysisManager {
  private readonly aiService: GeminiService;

  constructor() {
    this.aiService = new GeminiService();
  }

  /**
   * Analyze a single configuration with AI
   */
  async analyzeConfig(config: DotfileConfig): Promise<Result<DotfileConfig, Error>> {
    try {
      // First, parse the configuration to extract dependencies
      const parser = ParserFactory.getParser(config.type);
      const parseResult = parser.parse(config);
      
      if (parseResult.success) {
        // Extract dependencies from parser
        config.dependencies = parser.extractDependencies(config.content);
      }

      // Get AI analysis
      const aiResult = await this.aiService.analyzeConfig(config);
      
      if (aiResult.success) {
        config.aiAnalysis = aiResult.data;
        config.backupStatus = 'pending';
        
        return { success: true, data: config };
      } else {
        return { success: false, error: aiResult.error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Analyze multiple configurations
   */
  async analyzeMultipleConfigs(configs: DotfileConfig[]): Promise<Result<DotfileConfig[], Error>> {
    const results: DotfileConfig[] = [];
    const errors: Error[] = [];

    // Process configurations in parallel (with rate limiting)
    const batchSize = 5;
    for (let i = 0; i < configs.length; i += batchSize) {
      const batch = configs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(config => this.analyzeConfig(config));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          results.push(result.value.data);
        } else if (result.status === 'rejected') {
          errors.push(new Error(`Analysis failed for ${batch[index].path}: ${result.reason}`));
        } else if (result.status === 'fulfilled' && !result.value.success) {
          errors.push(result.value.error);
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < configs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return {
        success: false,
        error: new Error(`All analyses failed: ${errors.map(e => e.message).join(', ')}`),
      };
    }

    return { success: true, data: results };
  }

  /**
   * Get analysis summary for all configurations
   */
  async getAnalysisSummary(configs: DotfileConfig[]): Promise<Result<{
    totalConfigs: number;
    analyzedConfigs: number;
    categories: Record<string, number>;
    totalDependencies: string[];
    issues: string[];
    recommendations: string[];
  }, Error>> {
    try {
      const analyzedConfigs = configs.filter(config => config.aiAnalysis);
      const categories: Record<string, number> = {};
      const allDependencies: string[] = [];
      const allIssues: string[] = [];
      const recommendations: string[] = [];

      // Analyze categories
      analyzedConfigs.forEach(config => {
        if (config.aiAnalysis) {
          const category = config.aiAnalysis.category;
          categories[category] = (categories[category] || 0) + 1;
          
          allDependencies.push(...config.aiAnalysis.requiredPackages);
          allIssues.push(...config.aiAnalysis.issues);
        }
      });

      // Get AI recommendations for the entire setup
      const multiAnalysis = await this.aiService.analyzeMultipleConfigs(analyzedConfigs);
      if (multiAnalysis.success) {
        recommendations.push(...multiAnalysis.data.recommendations);
        recommendations.push(...multiAnalysis.data.improvements);
      }

      return {
        success: true,
        data: {
          totalConfigs: configs.length,
          analyzedConfigs: analyzedConfigs.length,
          categories,
          totalDependencies: [...new Set(allDependencies)],
          issues: [...new Set(allIssues)],
          recommendations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Generate setup scripts for all configurations
   */
  async generateSetupScripts(configs: DotfileConfig[]): Promise<Result<{
    [configPath: string]: string;
  }, Error>> {
    try {
      const scripts: { [configPath: string]: string } = {};

      for (const config of configs) {
        if (config.aiAnalysis) {
          const scriptResult = await this.aiService.generateSetupScript(
            config,
            config.dependencies
          );
          
          if (scriptResult.success) {
            scripts[config.path] = scriptResult.data;
          }
        }
      }

      return { success: true, data: scripts };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Generate documentation for all configurations
   */
  async generateDocumentation(configs: DotfileConfig[]): Promise<Result<{
    [configPath: string]: string;
  }, Error>> {
    try {
      const docs: { [configPath: string]: string } = {};

      for (const config of configs) {
        if (config.aiAnalysis) {
          const docResult = await this.aiService.generateDocumentation(config);
          
          if (docResult.success) {
            docs[config.path] = docResult.data;
          }
        }
      }

      return { success: true, data: docs };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Check if AI service is available
   */
  async isAIAvailable(): Promise<boolean> {
    try {
      const healthCheck = await this.aiService.healthCheck();
      return healthCheck.success && healthCheck.data;
    } catch {
      return false;
    }
  }
}
