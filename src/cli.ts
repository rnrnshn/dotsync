#!/usr/bin/env node

/**
 * DotSync CLI - AI-powered dotfile management
 */

import { Command } from 'commander';
import { DotfileScanner } from './scanner/dotfile-scanner';
import { SystemInfoGatherer } from './scanner/system-info';
import { BackupManager } from './github/backup-manager';
import { AnalysisManager } from './ai/analysis-manager';
import { RestoreManager } from './installer/restore-manager';
import { env } from './utils/env';

const program = new Command();

// Main program configuration
program
  .name('dotsync')
  .description('AI-powered dotfile management system for Ubuntu')
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--dry-run', 'Show what would be done without making changes');

// Scan command
program
  .command('scan')
  .description('Discover and analyze system dotfiles')
  .option('-p, --paths <paths...>', 'Specific paths to scan')
  .option('--no-ai', 'Skip AI analysis')
  .option('--max-size <size>', 'Maximum file size to scan (in MB)', '10')
  .option('--exclude <patterns...>', 'File patterns to exclude')
  .action(async (options) => {
    try {
      console.log('🔍 Scanning for dotfiles...');
      
      const scanner = new DotfileScanner();
      const scanOptions = {
        paths: options.paths,
        includeHidden: true,
        maxFileSize: parseInt(options.maxSize) * 1024 * 1024,
        excludePatterns: options.exclude,
        useAI: !options.noAi,
      };

      const result = await scanner.scan(scanOptions);
      
      if (result.success) {
        const { configs, metadata, errors } = result.data;
        
        console.log(`\n✅ Scan completed:`);
        console.log(`   📁 Files scanned: ${metadata.totalFiles}`);
        console.log(`   ⚙️ Configurations found: ${metadata.validConfigs}`);
        console.log(`   ⏱️ Duration: ${metadata.duration}ms`);
        
        if (errors.length > 0) {
          console.log(`   ⚠️ Errors: ${errors.length}`);
          if (program.opts().verbose) {
            errors.forEach(error => {
              console.log(`      - ${error.path}: ${error.message}`);
            });
          }
        }

        // Show discovered configurations
        if (configs.length > 0) {
          console.log(`\n📋 Discovered configurations:`);
          configs.forEach(config => {
            const size = (config.size / 1024).toFixed(1);
            console.log(`   ${config.type.padEnd(8)} ${config.path} (${size}KB)`);
          });
        }

        // AI analysis if requested
        if (!options.noAi && configs.length > 0) {
          console.log(`\n🤖 Analyzing configurations with AI...`);
          const analysisManager = new AnalysisManager();
          const analysisResult = await analysisManager.analyzeMultipleConfigs(configs);
          
          if (analysisResult.success) {
            const analyzedConfigs = analysisResult.data;
            const withAI = analyzedConfigs.filter(config => config.aiAnalysis);
            
            console.log(`   ✅ AI analysis completed for ${withAI.length} configurations`);
            
            if (program.opts().verbose) {
              analyzedConfigs.forEach(config => {
                if (config.aiAnalysis) {
                  console.log(`\n   📄 ${config.path}:`);
                  console.log(`      Description: ${config.aiAnalysis.description}`);
                  console.log(`      Category: ${config.aiAnalysis.category}`);
                  console.log(`      Dependencies: ${config.aiAnalysis.requiredPackages.join(', ') || 'None'}`);
                  console.log(`      Confidence: ${(config.aiAnalysis.confidence * 100).toFixed(1)}%`);
                }
              });
            }
          } else {
            console.log(`   ⚠️ AI analysis failed: ${analysisResult.error.message}`);
          }
        }
      } else {
        console.error(`❌ Scan failed: ${result.error.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Backup command
program
  .command('backup')
  .description('Create AI-analyzed backup of dotfiles to GitHub')
  .option('-r, --repo <name>', 'Repository name for backup')
  .option('--private', 'Create private repository')
  .option('--no-ai', 'Skip AI analysis')
  .option('--no-scripts', 'Skip setup script generation')
  .option('-m, --message <message>', 'Custom commit message')
  .action(async (options) => {
    try {
      console.log('🔄 Starting dotfile backup...');
      
      // First scan for configurations
      const scanner = new DotfileScanner();
      const scanResult = await scanner.scan({
        useAI: !options.noAi,
      });
      
      if (!scanResult.success) {
        console.error(`❌ Scan failed: ${scanResult.error.message}`);
        process.exit(1);
      }

      const { configs } = scanResult.data;
      
      if (configs.length === 0) {
        console.log('ℹ️ No configurations found to backup');
        return;
      }

      // Create backup
      const backupManager = new BackupManager();
      const backupOptions = {
        repoName: options.repo,
        isPrivate: options.private,
        includeAI: !options.noAi,
        createSetupScripts: !options.noScripts,
        commitMessage: options.message,
      };

      const backupResult = await backupManager.createBackup(configs, backupOptions);
      
      if (backupResult.success) {
        const { repoUrl, configCount, analysisCount } = backupResult.data;
        
        console.log(`\n✅ Backup completed successfully!`);
        console.log(`   🔗 Repository: ${repoUrl}`);
        console.log(`   ⚙️ Configurations: ${configCount}`);
        console.log(`   🤖 AI analyzed: ${analysisCount}`);
        console.log(`\n💡 To restore on a new machine:`);
        console.log(`   dotsync restore ${repoUrl}`);
      } else {
        console.error(`❌ Backup failed: ${backupResult.error.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Restore command
program
  .command('restore')
  .description('Restore dotfiles from a GitHub repository')
  .argument('<repo-url>', 'GitHub repository URL')
  .option('-i, --interactive', 'Interactive restoration mode')
  .option('--no-backup', 'Skip creating backups of existing files')
  .option('--no-packages', 'Skip package installation')
  .option('--dry-run', 'Show what would be restored without making changes')
  .action(async (repoUrl, options) => {
    try {
      console.log(`🔄 Restoring from ${repoUrl}...`);
      
      const restoreManager = new RestoreManager();
      const restoreOptions = {
        repoUrl,
        interactive: options.interactive,
        createBackups: !options.noBackup,
        installPackages: !options.noPackages,
        dryRun: options.dryRun,
      };

      const restoreResult = await restoreManager.restoreFromRepository(restoreOptions);
      
      if (restoreResult.success) {
        const { configCount, packagesInstalled } = restoreResult.data;
        
        console.log(`\n✅ Restoration completed successfully!`);
        console.log(`   ⚙️ Configurations restored: ${configCount}`);
        console.log(`   📦 Packages installed: ${packagesInstalled}`);
        console.log(`\n💡 Please restart your shell or run 'source ~/.bashrc' to apply changes.`);
      } else {
        console.error(`❌ Restoration failed: ${restoreResult.error.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Explain command
program
  .command('explain')
  .description('Get AI explanation of a configuration file')
  .argument('<file-path>', 'Path to configuration file')
  .action(async (filePath) => {
    try {
      console.log(`🤖 Analyzing ${filePath}...`);
      
      const scanner = new DotfileScanner();
      const scanResult = await scanner.scan({ paths: [filePath] });
      
      if (!scanResult.success) {
        console.error(`❌ Failed to read file: ${scanResult.error.message}`);
        process.exit(1);
      }

      const { configs } = scanResult.data;
      
      if (configs.length === 0) {
        console.log('ℹ️ No configuration found at the specified path');
        return;
      }

      const config = configs[0];
      const analysisManager = new AnalysisManager();
      const analysisResult = await analysisManager.analyzeConfig(config);
      
      if (analysisResult.success) {
        const analyzedConfig = analysisResult.data;
        
        if (analyzedConfig.aiAnalysis) {
          console.log(`\n📄 ${config.path}:`);
          console.log(`   Description: ${analyzedConfig.aiAnalysis.description}`);
          console.log(`   Category: ${analyzedConfig.aiAnalysis.category}`);
          console.log(`   Dependencies: ${analyzedConfig.aiAnalysis.requiredPackages.join(', ') || 'None'}`);
          console.log(`   Setup: ${analyzedConfig.aiAnalysis.setupInstructions}`);
          console.log(`   Confidence: ${(analyzedConfig.aiAnalysis.confidence * 100).toFixed(1)}%`);
          
          if (analyzedConfig.aiAnalysis.hasIssues) {
            console.log(`   Issues: ${analyzedConfig.aiAnalysis.issues.join(', ')}`);
          }
        } else {
          console.log('ℹ️ No AI analysis available for this configuration');
        }
      } else {
        console.error(`❌ Analysis failed: ${analysisResult.error.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// System info command
program
  .command('info')
  .description('Show system information and detected configurations')
  .action(async () => {
    try {
      console.log('🖥️ Gathering system information...');
      
      const systemGatherer = new SystemInfoGatherer();
      const systemInfo = await systemGatherer.gatherSystemInfo();
      
      console.log(`\n📊 System Information:`);
      console.log(`   OS: ${systemInfo.os} ${systemInfo.version}`);
      console.log(`   Shell: ${systemInfo.shell}`);
      console.log(`   Home: ${systemInfo.homeDir}`);
      console.log(`   Package Managers: ${systemInfo.packageManagers.join(', ')}`);
      console.log(`   Installed Packages: ${systemInfo.packages.length}`);
      
      if (program.opts().verbose) {
        console.log(`\n📦 Installed Packages:`);
        systemInfo.packages.slice(0, 20).forEach(pkg => {
          console.log(`   ${pkg.name} (${pkg.version}) - ${pkg.manager}`);
        });
        
        if (systemInfo.packages.length > 20) {
          console.log(`   ... and ${systemInfo.packages.length - 20} more`);
        }
      }
    } catch (error) {
      console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Health check command
program
  .command('health')
  .description('Check system health and dependencies')
  .action(async () => {
    try {
      console.log('🏥 Checking system health...');
      
      const checks = [
        { name: 'Environment Variables', status: 'checking...' },
        { name: 'GitHub API', status: 'checking...' },
        { name: 'AI Service', status: 'checking...' },
        { name: 'File System', status: 'checking...' },
      ];

      // Check environment variables
      try {
        if (!env.googleApiKey || !env.githubToken) {
          checks[0].status = '❌ Missing API keys';
        } else {
          checks[0].status = '✅ Configured';
        }
      } catch {
        checks[0].status = '❌ Configuration error';
      }

      // Check GitHub API
      try {
        const backupManager = new BackupManager();
        const listResult = await backupManager.listBackups();
        checks[1].status = listResult.success ? '✅ Connected' : '❌ Connection failed';
      } catch {
        checks[1].status = '❌ Connection failed';
      }

      // Check AI service
      try {
        const analysisManager = new AnalysisManager();
        const aiAvailable = await analysisManager.isAIAvailable();
        checks[2].status = aiAvailable ? '✅ Available' : '❌ Unavailable';
      } catch {
        checks[2].status = '❌ Unavailable';
      }

      // Check file system
      try {
        const scanner = new DotfileScanner();
        const scanResult = await scanner.scan({ paths: ['~/.bashrc'] });
        checks[3].status = scanResult.success ? '✅ Accessible' : '❌ Access denied';
      } catch {
        checks[3].status = '❌ Access denied';
      }

      console.log(`\n📋 Health Check Results:`);
      checks.forEach(check => {
        console.log(`   ${check.name}: ${check.status}`);
      });

      const allHealthy = checks.every(check => check.status.startsWith('✅'));
      
      if (allHealthy) {
        console.log(`\n✅ All systems healthy!`);
      } else {
        console.log(`\n⚠️ Some issues detected. Please check your configuration.`);
      }
    } catch (error) {
      console.error(`❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

