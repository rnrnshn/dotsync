/**
 * Restore manager for installing dotfiles from GitHub repositories
 */

import { execSync } from 'child_process';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';
import { RestoreOptions, Result, DotfileConfig } from '../types';

export class RestoreManager {
  private readonly homeDir: string;

  constructor() {
    this.homeDir = homedir();
  }

  /**
   * Restore configurations from a GitHub repository
   */
  async restoreFromRepository(options: RestoreOptions): Promise<Result<{
    configCount: number;
    packagesInstalled: number;
  }, Error>> {
    try {
      console.log(`🔄 Restoring from ${options.repoUrl}...`);

      // Step 1: Clone the repository
      const repoPath = await this.cloneRepository(options.repoUrl);
      
      // Step 2: Read configuration files
      const configs = await this.readConfigurations(repoPath);
      
      if (configs.length === 0) {
        return { success: false, error: new Error('No configurations found in repository') };
      }

      console.log(`📁 Found ${configs.length} configurations`);

      // Step 3: Install packages if requested
      let packagesInstalled = 0;
      if (options.installPackages) {
        packagesInstalled = await this.installPackages(configs, options.dryRun || false);
      }

      // Step 4: Create backups if requested
      if (options.createBackups) {
        await this.createBackups(configs);
      }

      // Step 5: Install configurations
      const installedCount = await this.installConfigurations(configs, options.dryRun || false);

      // Step 6: Run setup scripts if available
      await this.runSetupScripts(repoPath, options.dryRun || false);

      return {
        success: true,
        data: {
          configCount: installedCount,
          packagesInstalled,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Restoration failed: ${error instanceof Error ? error.message : String(error)}`),
      };
    }
  }

  /**
   * Clone the repository to a temporary location
   */
  private async cloneRepository(repoUrl: string): Promise<string> {
    const tempDir = join('/tmp', `dotsync-${Date.now()}`);
    
    try {
      console.log(`📥 Cloning repository...`);
      execSync(`git clone ${repoUrl} ${tempDir}`, { stdio: 'inherit' });
      return tempDir;
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Read configuration files from the repository
   */
  private async readConfigurations(repoPath: string): Promise<DotfileConfig[]> {
    const configs: DotfileConfig[] = [];
    
    try {
      // Read configurations from organized directories
      const categories = ['shell', 'editors', 'git', 'system'];
      
      for (const category of categories) {
        const categoryPath = join(repoPath, category);
        
        try {
          const files = await this.readDirectory(categoryPath);
          
          for (const file of files) {
            const filePath = join(categoryPath, file);
            const content = await readFile(filePath, 'utf8');
            
            const config: DotfileConfig = {
              path: this.determineTargetPath(file, category),
              type: this.determineConfigType(file, category),
              content,
              lastModified: new Date(),
              size: content.length,
              dependencies: [],
              isActive: true,
              backupStatus: 'not_backed_up',
            };
            
            configs.push(config);
          }
        } catch {
          // Category directory doesn't exist, skip
        }
      }
      
      return configs;
    } catch (error) {
      throw new Error(`Failed to read configurations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Install required packages
   */
  private async installPackages(configs: DotfileConfig[], dryRun: boolean = false): Promise<number> {
    try {
      console.log(`📦 Installing packages...`);
      
      const allDependencies = new Set<string>();
      
      // Extract dependencies from configurations
      configs.forEach(config => {
        if (config.aiAnalysis) {
          config.aiAnalysis.requiredPackages.forEach(dep => allDependencies.add(dep));
        }
      });
      
      if (allDependencies.size === 0) {
        console.log(`ℹ️ No packages to install`);
        return 0;
      }
      
      const packages = Array.from(allDependencies);
      console.log(`📦 Installing: ${packages.join(', ')}`);
      
      if (!dryRun) {
        execSync(`sudo apt update`, { stdio: 'inherit' });
        execSync(`sudo apt install -y ${packages.join(' ')}`, { stdio: 'inherit' });
      }
      
      return packages.length;
    } catch (error) {
      console.warn(`⚠️ Package installation failed: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Create backups of existing files
   */
  private async createBackups(configs: DotfileConfig[]): Promise<void> {
    try {
      console.log(`💾 Creating backups...`);
      
      for (const config of configs) {
        const targetPath = this.resolvePath(config.path);
        
        try {
          await stat(targetPath);
          
          // File exists, create backup
          const backupPath = `${targetPath}.backup.${Date.now()}`;
          const content = await readFile(targetPath, 'utf8');
          await writeFile(backupPath, content);
          
          console.log(`   💾 Backed up ${config.path} → ${backupPath}`);
        } catch {
          // File doesn't exist, no backup needed
        }
      }
    } catch (error) {
      console.warn(`⚠️ Backup creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Install configuration files
   */
  private async installConfigurations(configs: DotfileConfig[], dryRun: boolean): Promise<number> {
    let installedCount = 0;
    
    console.log(`📁 Installing configurations...`);
    
    for (const config of configs) {
      const targetPath = this.resolvePath(config.path);
      
      try {
        if (!dryRun) {
          // Create directory if it doesn't exist
          await mkdir(dirname(targetPath), { recursive: true });
          
          // Write configuration file
          await writeFile(targetPath, config.content);
          
          // Set appropriate permissions
          if (config.path.includes('.ssh')) {
            execSync(`chmod 600 ${targetPath}`);
          } else if (config.path.includes('bin/')) {
            execSync(`chmod +x ${targetPath}`);
          }
        }
        
        console.log(`   ✅ ${config.path}`);
        installedCount++;
      } catch (error) {
        console.warn(`   ⚠️ Failed to install ${config.path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return installedCount;
  }

  /**
   * Run setup scripts if available
   */
  private async runSetupScripts(repoPath: string, dryRun: boolean): Promise<void> {
    try {
      const setupScript = join(repoPath, 'setup.sh');
      
      try {
        await stat(setupScript);
        
        console.log(`🚀 Running setup script...`);
        
        if (!dryRun) {
          execSync(`chmod +x ${setupScript}`);
          execSync(`bash ${setupScript}`, { stdio: 'inherit' });
        } else {
          console.log(`   [DRY RUN] Would execute: bash ${setupScript}`);
        }
      } catch {
        // No setup script found
      }
    } catch (error) {
      console.warn(`⚠️ Setup script execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Read directory contents
   */
  private async readDirectory(dirPath: string): Promise<string[]> {
    const { readdir } = await import('fs/promises');
    return await readdir(dirPath);
  }

  /**
   * Determine target path for configuration file
   */
  private determineTargetPath(filename: string, category: string): string {
    const baseName = basename(filename);
    
    // Map common filenames to their target paths
    const pathMap: Record<string, string> = {
      '.bashrc': '~/.bashrc',
      '.zshrc': '~/.zshrc',
      '.vimrc': '~/.vimrc',
      '.gitconfig': '~/.gitconfig',
      'config': '~/.ssh/config',
    };
    
    return pathMap[baseName] || `~/${baseName}`;
  }

  /**
   * Determine configuration type
   */
  private determineConfigType(filename: string, category: string): any {
    const typeMap: Record<string, any> = {
      '.bashrc': 'bash',
      '.zshrc': 'zsh',
      '.vimrc': 'vim',
      '.gitconfig': 'git',
      'config': 'ssh',
    };
    
    return typeMap[basename(filename)] || category;
  }

  /**
   * Resolve path (handle ~ expansion)
   */
  private resolvePath(path: string): string {
    if (path.startsWith('~')) {
      return join(this.homeDir, path.slice(1));
    }
    return path;
  }
}
