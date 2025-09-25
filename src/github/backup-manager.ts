/**
 * Backup manager for coordinating dotfile backups to GitHub
 */

import { DotfileConfig, BackupOptions, Result } from '../types';
import { RepositoryManager } from './repository-manager';
import { AnalysisManager } from '../ai/analysis-manager';

export class BackupManager {
  private readonly repoManager: RepositoryManager;
  private readonly analysisManager: AnalysisManager;

  constructor() {
    this.repoManager = new RepositoryManager();
    this.analysisManager = new AnalysisManager();
  }

  /**
   * Create a complete backup of dotfile configurations
   */
  async createBackup(
    configs: DotfileConfig[],
    options: BackupOptions = {}
  ): Promise<Result<{
    repoUrl: string;
    configCount: number;
    analysisCount: number;
  }, Error>> {
    try {
      console.log(`🔄 Starting backup of ${configs.length} configurations...`);

      // Step 1: Analyze configurations with AI if requested
      let analyzedConfigs = configs;
      if (options.includeAI) {
        console.log('🤖 Analyzing configurations with AI...');
        const analysisResult = await this.analysisManager.analyzeMultipleConfigs(configs);
        
        if (analysisResult.success) {
          analyzedConfigs = analysisResult.data;
          console.log(`✅ AI analysis completed for ${analyzedConfigs.length} configurations`);
        } else {
          console.warn('⚠️ AI analysis failed, proceeding without AI insights');
        }
      }

      // Step 2: Create GitHub repository
      console.log('📦 Creating GitHub repository...');
      const repoResult = await this.repoManager.createRepository(options);
      
      if (!repoResult.success) {
        return { success: false, error: repoResult.error };
      }

      console.log(`✅ Repository created: ${repoResult.data.url}`);

      // Step 3: Upload configurations to repository
      console.log('⬆️ Uploading configurations...');
      const uploadResult = await this.repoManager.uploadConfigurations(
        repoResult.data,
        analyzedConfigs,
        options
      );

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      console.log('✅ Backup completed successfully!');

      const analysisCount = analyzedConfigs.filter(config => config.aiAnalysis).length;

      return {
        success: true,
        data: {
          repoUrl: uploadResult.data,
          configCount: configs.length,
          analysisCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Update an existing backup
   */
  async updateBackup(
    repoUrl: string,
    configs: DotfileConfig[],
    options: BackupOptions = {}
  ): Promise<Result<{
    repoUrl: string;
    updatedCount: number;
  }, Error>> {
    try {
      console.log(`🔄 Updating backup with ${configs.length} configurations...`);

      // Extract repository info from URL
      const repoInfo = this.parseRepoUrl(repoUrl);
      if (!repoInfo) {
        return { success: false, error: new Error('Invalid repository URL') };
      }

      // Analyze configurations if requested
      let analyzedConfigs = configs;
      if (options.includeAI) {
        const analysisResult = await this.analysisManager.analyzeMultipleConfigs(configs);
        if (analysisResult.success) {
          analyzedConfigs = analysisResult.data;
        }
      }

      // Create a mock repo object for the update
      const repo = {
        name: repoInfo.name,
        url: repoUrl,
        isPrivate: false,
        description: 'Updated dotfile backup',
        lastCommit: 'main',
        createdAt: new Date(),
      };

      // Upload updated configurations
      const uploadResult = await this.repoManager.uploadConfigurations(
        repo,
        analyzedConfigs,
        options
      );

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      return {
        success: true,
        data: {
          repoUrl,
          updatedCount: configs.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Backup update failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Get backup summary
   */
  async getBackupSummary(repoUrl: string): Promise<Result<{
    repoName: string;
    configCount: number;
    lastUpdated: Date;
    categories: { [key: string]: number };
  }, Error>> {
    try {
      const repoInfo = this.parseRepoUrl(repoUrl);
      if (!repoInfo) {
        return { success: false, error: new Error('Invalid repository URL') };
      }

      // This would typically fetch repository information from GitHub API
      // For now, return a basic structure
      return {
        success: true,
        data: {
          repoName: repoInfo.name,
          configCount: 0, // Would be fetched from API
          lastUpdated: new Date(),
          categories: {},
        },
      };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Failed to get backup summary: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * List available backups for the current user
   */
  async listBackups(): Promise<Result<{
    name: string;
    url: string;
    lastUpdated: Date;
    configCount: number;
  }[], Error>> {
    try {
      // This would typically list repositories from GitHub API
      // For now, return empty array
      return {
        success: true,
        data: [],
      };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Failed to list backups: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Delete a backup repository
   */
  async deleteBackup(repoUrl: string): Promise<Result<void, Error>> {
    try {
      const repoInfo = this.parseRepoUrl(repoUrl);
      if (!repoInfo) {
        return { success: false, error: new Error('Invalid repository URL') };
      }

      // This would typically delete the repository via GitHub API
      // For now, just return success
      console.log(`🗑️ Repository ${repoInfo.name} would be deleted`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Failed to delete backup: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Parse repository URL to extract owner and name
   */
  private parseRepoUrl(url: string): { owner: string; name: string } | null {
    try {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (match) {
        return {
          owner: match[1],
          name: match[2].replace('.git', ''),
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

