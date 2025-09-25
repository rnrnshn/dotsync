/**
 * Simple AI service for basic functionality
 */

import { DotfileConfig, ConfigAnalysis, Result } from '../types';

export class SimpleAIService {
  /**
   * Analyze a configuration file using AI
   */
  async analyzeConfig(config: DotfileConfig): Promise<Result<ConfigAnalysis, Error>> {
    try {
      // Simple analysis without AI for now
      const analysis: ConfigAnalysis = {
        description: this.generateDescription(config),
        category: this.determineCategory(config),
        requiredPackages: this.extractDependencies(config.content),
        setupInstructions: this.generateSetupInstructions(config),
        hasIssues: false,
        issues: [],
        confidence: 0.8,
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
      const script = this.createSetupScript(config, dependencies);
      return { success: true, data: script };
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
      const explanation = this.generateExplanation(config);
      return { success: true, data: explanation };
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
      const recommendations: string[] = [];
      const conflicts: string[] = [];
      const improvements: string[] = [];

      // Basic analysis
      if (configs.length > 10) {
        recommendations.push('Consider organizing configurations into categories');
      }

      if (configs.some(c => c.type === 'bash') && configs.some(c => c.type === 'zsh')) {
        conflicts.push('Both bash and zsh configurations detected - ensure compatibility');
      }

      improvements.push('Add comments to configuration files for better maintainability');

      return { success: true, data: { recommendations, conflicts, improvements } };
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
      const doc = this.createDocumentation(config);
      return { success: true, data: doc };
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
    return { success: true, data: true };
  }

  private generateDescription(config: DotfileConfig): string {
    switch (config.type) {
      case 'bash':
        return 'Bash shell configuration file';
      case 'zsh':
        return 'Zsh shell configuration file';
      case 'vim':
        return 'Vim editor configuration file';
      case 'git':
        return 'Git configuration file';
      case 'ssh':
        return 'SSH configuration file';
      default:
        return `${config.type} configuration file`;
    }
  }

  private determineCategory(config: DotfileConfig): any {
    switch (config.type) {
      case 'bash':
      case 'zsh':
        return 'shell';
      case 'vim':
        return 'editor';
      case 'git':
        return 'git';
      case 'ssh':
        return 'system';
      default:
        return 'system';
    }
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('apt install') || line.includes('apt-get install')) {
        const match = line.match(/apt(?:-get)?\s+install\s+(.+)/);
        if (match) {
          const packages = match[1].split(/\s+/).filter(pkg => pkg && !pkg.startsWith('-'));
          dependencies.push(...packages);
        }
      }
    }

    return [...new Set(dependencies)];
  }

  private generateSetupInstructions(config: DotfileConfig): string {
    return `To install this ${config.type} configuration:
1. Backup your existing ${config.path} file
2. Copy this configuration to ${config.path}
3. Restart your shell or reload the configuration`;
  }

  private createSetupScript(config: DotfileConfig, dependencies: string[]): string {
    let script = `#!/bin/bash\n\n`;
    script += `# Setup script for ${config.path}\n\n`;
    script += `# Install dependencies\n`;
    if (dependencies.length > 0) {
      script += `sudo apt update\n`;
      script += `sudo apt install -y ${dependencies.join(' ')}\n\n`;
    }
    script += `# Backup existing file\n`;
    script += `if [ -f "${config.path}" ]; then\n`;
    script += `  cp "${config.path}" "${config.path}.backup.$(date +%s)"\n`;
    script += `fi\n\n`;
    script += `# Install configuration\n`;
    script += `cp "${basename(config.path)}" "${config.path}"\n`;
    script += `echo "Configuration installed successfully!"\n`;
    
    return script;
  }

  private generateExplanation(config: DotfileConfig): string {
    return `This is a ${config.type} configuration file located at ${config.path}. ` +
           `It contains settings and customizations for your ${config.type} environment. ` +
           `The file is ${config.size} bytes and was last modified on ${config.lastModified.toISOString()}.`;
  }

  private createDocumentation(config: DotfileConfig): string {
    return `# ${config.path}\n\n` +
           `**Type**: ${config.type}\n` +
           `**Size**: ${config.size} bytes\n` +
           `**Last Modified**: ${config.lastModified.toISOString()}\n\n` +
           `## Description\n\n` +
           `This is a ${config.type} configuration file.\n\n` +
           `## Installation\n\n` +
           `Copy this file to ${config.path} to use these settings.\n`;
  }
}

function basename(path: string): string {
  return path.split('/').pop() || path;
}

