/**
 * GitHub repository management for dotfile backups
 */

import { Octokit } from '@octokit/rest';
import { DotfileConfig, GitHubRepo, BackupOptions, Result } from '../types';
import { COMMIT_MESSAGES } from '../types/constants';
import { env } from '../utils/env';

export class RepositoryManager {
  private readonly octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: env.githubToken,
    });
  }

  /**
   * Create a new repository for dotfile backup
   */
  async createRepository(options: BackupOptions): Promise<Result<GitHubRepo, Error>> {
    try {
      const repoName = options.repoName || `dotfiles-${new Date().toISOString().split('T')[0]}`;
      
      const repo = await this.octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'AI-analyzed dotfile configurations',
        private: options.isPrivate || false,
        auto_init: true,
        gitignore_template: 'Node',
      });

      const githubRepo: GitHubRepo = {
        name: repo.data.name,
        url: repo.data.html_url,
        isPrivate: repo.data.private,
        description: repo.data.description || '',
        lastCommit: repo.data.default_branch || 'main',
        createdAt: new Date(repo.data.created_at),
      };

      return { success: true, data: githubRepo };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Repository creation failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Upload configurations to repository
   */
  async uploadConfigurations(
    repo: GitHubRepo,
    configs: DotfileConfig[],
    options: BackupOptions
  ): Promise<Result<string, Error>> {
    try {
      const owner = await this.getCurrentUser();
      if (!owner.success) {
        return { success: false, error: owner.error };
      }

      // Create organized directory structure
      const organizedConfigs = this.organizeConfigs(configs);
      
      // Upload each configuration
      for (const [category, categoryConfigs] of Object.entries(organizedConfigs)) {
        for (const config of categoryConfigs) {
          const result = await this.uploadConfig(owner.data, repo.name, category, config);
          if (!result.success) {
            return { success: false, error: result.error };
          }
        }
      }

      // Create README with AI analysis
      if (options.includeAI) {
        const readmeResult = await this.createReadme(owner.data, repo.name, configs);
        if (!readmeResult.success) {
          return { success: false, error: readmeResult.error };
        }
      }

      // Create setup scripts
      if (options.createSetupScripts) {
        const scriptsResult = await this.createSetupScripts(owner.data, repo.name, configs);
        if (!scriptsResult.success) {
          return { success: false, error: scriptsResult.error };
        }
      }

      return { success: true, data: repo.url };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Configuration upload failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Upload a single configuration file
   */
  private async uploadConfig(
    owner: string,
    repoName: string,
    category: string,
    config: DotfileConfig
  ): Promise<Result<void, Error>> {
    try {
      const path = `${category}/${this.getFileName(config.path)}`;
      const content = Buffer.from(config.content).toString('base64');
      
      const commitMessage = config.aiAnalysis 
        ? COMMIT_MESSAGES.ADD_CONFIG.replace('{type}', config.type)
        : COMMIT_MESSAGES.ADD_CONFIG.replace('{type}', config.type);

      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path,
        message: commitMessage,
        content,
      });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Failed to upload ${config.path}: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Create comprehensive README with AI analysis
   */
  private async createReadme(
    owner: string,
    repoName: string,
    configs: DotfileConfig[]
  ): Promise<Result<void, Error>> {
    try {
      const analyzedConfigs = configs.filter(config => config.aiAnalysis);
      
      let readme = `# Dotfiles Backup\n\n`;
      readme += `Generated on ${new Date().toISOString()}\n\n`;
      readme += `## Overview\n\n`;
      readme += `This repository contains ${configs.length} configuration files with AI analysis.\n\n`;
      
      if (analyzedConfigs.length > 0) {
        readme += `## AI Analysis Summary\n\n`;
        
        // Group by category
        const categories: { [key: string]: DotfileConfig[] } = {};
        analyzedConfigs.forEach(config => {
          if (config.aiAnalysis) {
            const category = config.aiAnalysis.category;
            if (!categories[category]) categories[category] = [];
            categories[category].push(config);
          }
        });

        for (const [category, categoryConfigs] of Object.entries(categories)) {
          readme += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Configurations\n\n`;
          
          categoryConfigs.forEach(config => {
            if (config.aiAnalysis) {
              readme += `#### ${this.getFileName(config.path)}\n`;
              readme += `- **Description**: ${config.aiAnalysis.description}\n`;
              readme += `- **Dependencies**: ${config.aiAnalysis.requiredPackages.join(', ') || 'None'}\n`;
              readme += `- **Confidence**: ${(config.aiAnalysis.confidence * 100).toFixed(1)}%\n`;
              
              if (config.aiAnalysis.hasIssues && config.aiAnalysis.issues.length > 0) {
                readme += `- **Issues**: ${config.aiAnalysis.issues.join(', ')}\n`;
              }
              
              readme += `\n`;
            }
          });
        }
      }

      readme += `## Installation\n\n`;
      readme += `To restore these configurations on a new machine:\n\n`;
      readme += `\`\`\`bash\n`;
      readme += `# Clone this repository\n`;
      readme += `git clone ${repoName}\n`;
      readme += `cd ${repoName}\n\n`;
      readme += `# Run the setup script\n`;
      readme += `./setup.sh\n`;
      readme += `\`\`\`\n\n`;
      readme += `## Manual Installation\n\n`;
      readme += `If you prefer to install manually, copy the configuration files to their respective locations:\n\n`;
      
      configs.forEach(config => {
        readme += `- \`${config.path}\` → Copy to \`${config.path}\`\n`;
      });

      const content = Buffer.from(readme).toString('base64');
      
      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: 'README.md',
        message: 'docs: add comprehensive README with AI analysis',
        content,
      });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Failed to create README: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Create setup scripts for easy installation
   */
  private async createSetupScripts(
    owner: string,
    repoName: string,
    configs: DotfileConfig[]
  ): Promise<Result<void, Error>> {
    try {
      // Create main setup script
      const setupScript = this.generateSetupScript(configs);
      const setupContent = Buffer.from(setupScript).toString('base64');
      
      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: 'setup.sh',
        message: 'feat: add automated setup script',
        content: setupContent,
      });

      // Create individual category scripts
      const organizedConfigs = this.organizeConfigs(configs);
      
      for (const [category, categoryConfigs] of Object.entries(organizedConfigs)) {
        const categoryScript = this.generateCategoryScript(category, categoryConfigs);
        const categoryContent = Buffer.from(categoryScript).toString('base64');
        
        await this.octokit.repos.createOrUpdateFileContents({
          owner,
          repo: repoName,
          path: `scripts/setup-${category}.sh`,
          message: `feat: add ${category} setup script`,
          content: categoryContent,
        });
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Failed to create setup scripts: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Organize configurations by category
   */
  private organizeConfigs(configs: DotfileConfig[]): { [category: string]: DotfileConfig[] } {
    const organized: { [category: string]: DotfileConfig[] } = {
      shell: [],
      editors: [],
      git: [],
      system: [],
    };

    configs.forEach(config => {
      let category = 'system';
      
      if (config.type === 'bash' || config.type === 'zsh') {
        category = 'shell';
      } else if (config.type === 'vim') {
        category = 'editors';
      } else if (config.type === 'git') {
        category = 'git';
      } else if (config.aiAnalysis) {
        category = config.aiAnalysis.category;
      }

      if (!organized[category]) {
        organized[category] = [];
      }
      organized[category].push(config);
    });

    return organized;
  }

  /**
   * Generate main setup script
   */
  private generateSetupScript(configs: DotfileConfig[]): string {
    let script = `#!/bin/bash\n\n`;
    script += `# DotSync Setup Script\n`;
    script += `# Generated on ${new Date().toISOString()}\n\n`;
    script += `set -e\n\n`;
    script += `echo "🚀 Setting up dotfiles..."\n\n`;
    
    // Install dependencies
    const allDependencies = new Set<string>();
    configs.forEach(config => {
      if (config.aiAnalysis) {
        config.aiAnalysis.requiredPackages.forEach(dep => allDependencies.add(dep));
      }
    });

    if (allDependencies.size > 0) {
      script += `# Install dependencies\n`;
      script += `echo "📦 Installing dependencies..."\n`;
      script += `sudo apt update\n`;
      script += `sudo apt install -y ${Array.from(allDependencies).join(' ')}\n\n`;
    }

    // Copy configuration files
    script += `# Copy configuration files\n`;
    script += `echo "📁 Copying configuration files..."\n`;
    
    configs.forEach(config => {
      script += `# ${config.path}\n`;
      script += `mkdir -p \`dirname ${config.path}\`\n`;
      script += `cp ${this.getFileName(config.path)} ${config.path}\n`;
    });

    script += `\necho "✅ Setup complete!"\n`;
    script += `echo "Please restart your shell or run 'source ~/.bashrc' to apply changes."\n`;

    return script;
  }

  /**
   * Generate category-specific setup script
   */
  private generateCategoryScript(category: string, configs: DotfileConfig[]): string {
    let script = `#!/bin/bash\n\n`;
    script += `# ${category.charAt(0).toUpperCase() + category.slice(1)} Configuration Setup\n\n`;
    script += `set -e\n\n`;
    script += `echo "Setting up ${category} configurations..."\n\n`;

    configs.forEach(config => {
      if (config.aiAnalysis) {
        script += `# ${config.aiAnalysis.description}\n`;
        script += `# Dependencies: ${config.aiAnalysis.requiredPackages.join(', ') || 'None'}\n`;
        script += `cp ${this.getFileName(config.path)} ${config.path}\n`;
        
        if (config.aiAnalysis.setupInstructions) {
          script += `# ${config.aiAnalysis.setupInstructions}\n`;
        }
        script += `\n`;
      }
    });

    return script;
  }

  /**
   * Get current GitHub user
   */
  private async getCurrentUser(): Promise<Result<string, Error>> {
    try {
      const user = await this.octokit.users.getAuthenticated();
      return { success: true, data: user.data.login };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Failed to get current user: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Get filename from path
   */
  private getFileName(path: string): string {
    return path.split('/').pop() || path;
  }
}
