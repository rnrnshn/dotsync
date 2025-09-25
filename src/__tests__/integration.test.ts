/**
 * Integration tests for end-to-end workflows
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { execSync } from 'child_process';
import { readFile, writeFile, mkdir, rm, stat } from 'fs/promises';
import { join } from 'path';

// Mock all external dependencies
jest.mock('../scanner/dotfile-scanner');
jest.mock('../scanner/system-info');
jest.mock('../github/backup-manager');
jest.mock('../ai/analysis-manager');
jest.mock('../installer/restore-manager');
jest.mock('../utils/env');

describe('DotSync Integration Tests', () => {
  let testDir: string;
  let mockConfigs: any[];

  beforeEach(async () => {
    testDir = join('/tmp', `dotsync-integration-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    mockConfigs = [
      {
        path: '~/.bashrc',
        type: 'bash',
        content: 'export PATH=$PATH:/usr/local/bin\nalias ll="ls -la"',
        lastModified: new Date(),
        size: 50,
        dependencies: ['bash'],
        isActive: true,
        backupStatus: 'not_backed_up',
        aiAnalysis: {
          description: 'Bash configuration with PATH export and aliases',
          category: 'shell',
          requiredPackages: ['bash'],
          setupInstructions: 'Copy to ~/.bashrc and source it',
          hasIssues: false,
          issues: [],
          confidence: 0.9,
        },
      },
      {
        path: '~/.vimrc',
        type: 'vim',
        content: 'set number\nset tabstop=2\nset expandtab',
        lastModified: new Date(),
        size: 30,
        dependencies: ['vim'],
        isActive: true,
        backupStatus: 'not_backed_up',
        aiAnalysis: {
          description: 'Vim configuration with basic settings',
          category: 'editor',
          requiredPackages: ['vim'],
          setupInstructions: 'Copy to ~/.vimrc',
          hasIssues: false,
          issues: [],
          confidence: 0.8,
        },
      },
      {
        path: '~/.gitconfig',
        type: 'git',
        content: '[user]\n  name = Test User\n  email = test@example.com',
        lastModified: new Date(),
        size: 40,
        dependencies: ['git'],
        isActive: true,
        backupStatus: 'not_backed_up',
        aiAnalysis: {
          description: 'Git configuration with user settings',
          category: 'git',
          requiredPackages: ['git'],
          setupInstructions: 'Copy to ~/.gitconfig',
          hasIssues: false,
          issues: [],
          confidence: 0.95,
        },
      },
    ];
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Complete Workflow: Scan → Backup → Restore', () => {
    it('should complete full workflow successfully', async () => {
      // Mock environment
      const { env } = require('../utils/env');
      env.googleApiKey = 'test-key';
      env.githubToken = 'test-token';

      // Mock scanner
      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configs: mockConfigs,
          metadata: {
            totalFiles: 3,
            validConfigs: 3,
            duration: 200,
            startTime: new Date(),
            endTime: new Date(),
          },
          errors: [],
        },
      });

      // Mock AI analysis
      const { AnalysisManager } = require('../ai/analysis-manager');
      AnalysisManager.prototype.analyzeMultipleConfigs = jest.fn().mockResolvedValue({
        success: true,
        data: mockConfigs,
      });

      // Mock backup manager
      const { BackupManager } = require('../github/backup-manager');
      BackupManager.prototype.createBackup = jest.fn().mockResolvedValue({
        success: true,
        data: {
          repoUrl: 'https://github.com/user/test-dotfiles',
          configCount: 3,
          analysisCount: 3,
        },
      });

      // Mock restore manager
      const { RestoreManager } = require('../installer/restore-manager');
      RestoreManager.prototype.restoreFromRepository = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configCount: 3,
          packagesInstalled: 3,
        },
      });

      // Test scan command
      const scanResult = execSync('node dist/cli.js scan', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(scanResult).toContain('Scan completed');
      expect(scanResult).toContain('Files scanned: 3');
      expect(scanResult).toContain('Configurations found: 3');

      // Test backup command
      const backupResult = execSync('node dist/cli.js backup --repo test-dotfiles', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(backupResult).toContain('Backup completed successfully');
      expect(backupResult).toContain('Repository: https://github.com/user/test-dotfiles');
      expect(backupResult).toContain('Configurations: 3');
      expect(backupResult).toContain('AI analyzed: 3');

      // Test restore command
      const restoreResult = execSync('node dist/cli.js restore https://github.com/user/test-dotfiles', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(restoreResult).toContain('Restoration completed successfully');
      expect(restoreResult).toContain('Configurations restored: 3');
      expect(restoreResult).toContain('Packages installed: 3');
    });

    it('should handle workflow with AI analysis failures', async () => {
      // Mock environment
      const { env } = require('../utils/env');
      env.googleApiKey = 'test-key';
      env.githubToken = 'test-token';

      // Mock scanner
      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configs: mockConfigs,
          metadata: {
            totalFiles: 3,
            validConfigs: 3,
            duration: 200,
            startTime: new Date(),
            endTime: new Date(),
          },
          errors: [],
        },
      });

      // Mock AI analysis failure
      const { AnalysisManager } = require('../ai/analysis-manager');
      AnalysisManager.prototype.analyzeMultipleConfigs = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('AI service unavailable'),
      });

      // Mock backup manager
      const { BackupManager } = require('../github/backup-manager');
      BackupManager.prototype.createBackup = jest.fn().mockResolvedValue({
        success: true,
        data: {
          repoUrl: 'https://github.com/user/test-dotfiles',
          configCount: 3,
          analysisCount: 0,
        },
      });

      // Test backup command with AI failure
      const backupResult = execSync('node dist/cli.js backup --repo test-dotfiles', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(backupResult).toContain('Backup completed successfully');
      expect(backupResult).toContain('AI analyzed: 0');
    });

    it('should handle workflow with GitHub API failures', async () => {
      // Mock environment
      const { env } = require('../utils/env');
      env.googleApiKey = 'test-key';
      env.githubToken = 'test-token';

      // Mock scanner
      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configs: mockConfigs,
          metadata: {
            totalFiles: 3,
            validConfigs: 3,
            duration: 200,
            startTime: new Date(),
            endTime: new Date(),
          },
          errors: [],
        },
      });

      // Mock AI analysis
      const { AnalysisManager } = require('../ai/analysis-manager');
      AnalysisManager.prototype.analyzeMultipleConfigs = jest.fn().mockResolvedValue({
        success: true,
        data: mockConfigs,
      });

      // Mock backup manager failure
      const { BackupManager } = require('../github/backup-manager');
      BackupManager.prototype.createBackup = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('GitHub API rate limit exceeded'),
      });

      // Test backup command with GitHub failure
      try {
        execSync('node dist/cli.js backup --repo test-dotfiles', { 
          cwd: testDir,
          encoding: 'utf8',
          stdio: 'pipe',
        });
        fail('Command should have failed');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle partial scan failures', async () => {
      // Mock environment
      const { env } = require('../utils/env');
      env.googleApiKey = 'test-key';
      env.githubToken = 'test-token';

      // Mock scanner with partial failures
      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configs: [mockConfigs[0]], // Only one config found
          metadata: {
            totalFiles: 3,
            validConfigs: 1,
            duration: 200,
            startTime: new Date(),
            endTime: new Date(),
          },
          errors: [
            {
              path: '~/.vimrc',
              message: 'Permission denied',
              type: 'permission',
              name: 'ScanError',
            },
            {
              path: '~/.gitconfig',
              message: 'File not found',
              type: 'not_found',
              name: 'ScanError',
            },
          ],
        },
      });

      // Test scan command with errors
      const scanResult = execSync('node dist/cli.js scan --verbose', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(scanResult).toContain('Scan completed');
      expect(scanResult).toContain('Files scanned: 3');
      expect(scanResult).toContain('Configurations found: 1');
      expect(scanResult).toContain('Errors: 2');
    });

    it('should handle restore with missing dependencies', async () => {
      // Mock restore manager with package installation failure
      const { RestoreManager } = require('../installer/restore-manager');
      RestoreManager.prototype.restoreFromRepository = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configCount: 3,
          packagesInstalled: 0, // No packages installed
        },
      });

      // Test restore command
      const restoreResult = execSync('node dist/cli.js restore https://github.com/user/test-dotfiles', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(restoreResult).toContain('Restoration completed successfully');
      expect(restoreResult).toContain('Packages installed: 0');
    });
  });

  describe('Interactive Workflows', () => {
    it('should handle interactive restore mode', async () => {
      // Mock restore manager
      const { RestoreManager } = require('../installer/restore-manager');
      RestoreManager.prototype.restoreFromRepository = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configCount: 3,
          packagesInstalled: 3,
        },
      });

      // Test interactive restore
      const restoreResult = execSync('node dist/cli.js restore https://github.com/user/test-dotfiles --interactive', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(restoreResult).toContain('Restoration completed successfully');
    });

    it('should handle dry run mode', async () => {
      // Mock restore manager
      const { RestoreManager } = require('../installer/restore-manager');
      RestoreManager.prototype.restoreFromRepository = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configCount: 3,
          packagesInstalled: 0, // No packages in dry run
        },
      });

      // Test dry run restore
      const restoreResult = execSync('node dist/cli.js restore https://github.com/user/test-dotfiles --dry-run', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(restoreResult).toContain('Restoration completed successfully');
    });
  });

  describe('System Health Workflows', () => {
    it('should perform health check successfully', async () => {
      // Mock all services
      const { BackupManager } = require('../github/backup-manager');
      BackupManager.prototype.listBackups = jest.fn().mockResolvedValue({
        success: true,
        data: [],
      });

      const { AnalysisManager } = require('../ai/analysis-manager');
      AnalysisManager.prototype.isAIAvailable = jest.fn().mockResolvedValue(true);

      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configs: [],
          metadata: {
            totalFiles: 0,
            validConfigs: 0,
            duration: 50,
            startTime: new Date(),
            endTime: new Date(),
          },
          errors: [],
        },
      });

      // Mock environment
      const { env } = require('../utils/env');
      env.googleApiKey = 'test-key';
      env.githubToken = 'test-token';

      // Test health check
      const healthResult = execSync('node dist/cli.js health', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(healthResult).toContain('Health Check Results');
      expect(healthResult).toContain('All systems healthy');
    });

    it('should detect health issues', async () => {
      // Mock failing services
      const { BackupManager } = require('../github/backup-manager');
      BackupManager.prototype.listBackups = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('GitHub API error'),
      });

      const { AnalysisManager } = require('../ai/analysis-manager');
      AnalysisManager.prototype.isAIAvailable = jest.fn().mockResolvedValue(false);

      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('File system error'),
      });

      // Mock environment
      const { env } = require('../utils/env');
      env.googleApiKey = 'test-key';
      env.githubToken = 'test-token';

      // Test health check
      const healthResult = execSync('node dist/cli.js health', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(healthResult).toContain('Health Check Results');
      expect(healthResult).toContain('Some issues detected');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of configurations', async () => {
      // Create large config set
      const largeConfigs = Array.from({ length: 100 }, (_, i) => ({
        path: `~/.config${i}`,
        type: 'custom',
        content: `# Configuration ${i}\nexport VAR${i}=value${i}`,
        lastModified: new Date(),
        size: 50,
        dependencies: [],
        isActive: true,
        backupStatus: 'not_backed_up',
      }));

      // Mock environment
      const { env } = require('../utils/env');
      env.googleApiKey = 'test-key';
      env.githubToken = 'test-token';

      // Mock scanner
      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configs: largeConfigs,
          metadata: {
            totalFiles: 100,
            validConfigs: 100,
            duration: 1000,
            startTime: new Date(),
            endTime: new Date(),
          },
          errors: [],
        },
      });

      // Mock AI analysis
      const { AnalysisManager } = require('../ai/analysis-manager');
      AnalysisManager.prototype.analyzeMultipleConfigs = jest.fn().mockResolvedValue({
        success: true,
        data: largeConfigs,
      });

      // Mock backup manager
      const { BackupManager } = require('../github/backup-manager');
      BackupManager.prototype.createBackup = jest.fn().mockResolvedValue({
        success: true,
        data: {
          repoUrl: 'https://github.com/user/large-dotfiles',
          configCount: 100,
          analysisCount: 100,
        },
      });

      const startTime = Date.now();

      // Test scan command
      const scanResult = execSync('node dist/cli.js scan', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const duration = Date.now() - startTime;

      expect(scanResult).toContain('Scan completed');
      expect(scanResult).toContain('Files scanned: 100');
      expect(scanResult).toContain('Configurations found: 100');
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
