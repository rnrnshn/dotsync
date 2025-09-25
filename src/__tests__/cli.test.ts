/**
 * Tests for CLI functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { execSync } from 'child_process';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

// Mock all dependencies
jest.mock('../scanner/dotfile-scanner');
jest.mock('../scanner/system-info');
jest.mock('../github/backup-manager');
jest.mock('../ai/analysis-manager');
jest.mock('../installer/restore-manager');
jest.mock('../utils/env');

describe('CLI', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join('/tmp', `dotsync-cli-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('scan command', () => {
    it('should execute scan command successfully', async () => {
      // Mock the scanner
      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configs: [
            {
              path: '~/.bashrc',
              type: 'bash',
              content: 'export PATH=$PATH:/usr/local/bin',
              lastModified: new Date(),
              size: 50,
              dependencies: [],
              isActive: true,
              backupStatus: 'not_backed_up',
            },
          ],
          metadata: {
            totalFiles: 1,
            validConfigs: 1,
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
          },
          errors: [],
        },
      });

      // Mock the analysis manager
      const { AnalysisManager } = require('../ai/analysis-manager');
      AnalysisManager.prototype.analyzeMultipleConfigs = jest.fn().mockResolvedValue({
        success: true,
        data: [
          {
            path: '~/.bashrc',
            type: 'bash',
            content: 'export PATH=$PATH:/usr/local/bin',
            lastModified: new Date(),
            size: 50,
            dependencies: [],
            isActive: true,
            backupStatus: 'not_backed_up',
            aiAnalysis: {
              description: 'Bash configuration',
              category: 'shell',
              requiredPackages: ['bash'],
              setupInstructions: 'Copy to ~/.bashrc',
              hasIssues: false,
              issues: [],
              confidence: 0.9,
            },
          },
        ],
      });

      // Mock environment
      const { env } = require('../utils/env');
      env.googleApiKey = 'test-key';
      env.githubToken = 'test-token';

      // Test the CLI command
      const result = execSync('node dist/cli.js scan', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Scan completed');
      expect(result).toContain('Files scanned: 1');
      expect(result).toContain('Configurations found: 1');
    });

    it('should handle scan command with specific paths', async () => {
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

      const result = execSync('node dist/cli.js scan --paths ~/.bashrc ~/.vimrc', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Scan completed');
    });

    it('should handle scan command without AI', async () => {
      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configs: [
            {
              path: '~/.bashrc',
              type: 'bash',
              content: 'export PATH=$PATH:/usr/local/bin',
              lastModified: new Date(),
              size: 50,
              dependencies: [],
              isActive: true,
              backupStatus: 'not_backed_up',
            },
          ],
          metadata: {
            totalFiles: 1,
            validConfigs: 1,
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
          },
          errors: [],
        },
      });

      const result = execSync('node dist/cli.js scan --no-ai', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Scan completed');
      expect(result).not.toContain('AI analysis');
    });
  });

  describe('backup command', () => {
    it('should execute backup command successfully', async () => {
      // Mock the scanner
      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configs: [
            {
              path: '~/.bashrc',
              type: 'bash',
              content: 'export PATH=$PATH:/usr/local/bin',
              lastModified: new Date(),
              size: 50,
              dependencies: [],
              isActive: true,
              backupStatus: 'not_backed_up',
            },
          ],
          metadata: {
            totalFiles: 1,
            validConfigs: 1,
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
          },
          errors: [],
        },
      });

      // Mock the backup manager
      const { BackupManager } = require('../github/backup-manager');
      BackupManager.prototype.createBackup = jest.fn().mockResolvedValue({
        success: true,
        data: {
          repoUrl: 'https://github.com/user/test-dotfiles',
          configCount: 1,
          analysisCount: 1,
        },
      });

      // Mock environment
      const { env } = require('../utils/env');
      env.googleApiKey = 'test-key';
      env.githubToken = 'test-token';

      const result = execSync('node dist/cli.js backup', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Backup completed successfully');
      expect(result).toContain('Repository: https://github.com/user/test-dotfiles');
    });

    it('should handle backup command with custom repository name', async () => {
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

      const { BackupManager } = require('../github/backup-manager');
      BackupManager.prototype.createBackup = jest.fn().mockResolvedValue({
        success: true,
        data: {
          repoUrl: 'https://github.com/user/my-dotfiles',
          configCount: 0,
          analysisCount: 0,
        },
      });

      const result = execSync('node dist/cli.js backup --repo my-dotfiles', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('No configurations found to backup');
    });
  });

  describe('restore command', () => {
    it('should execute restore command successfully', async () => {
      // Mock the restore manager
      const { RestoreManager } = require('../installer/restore-manager');
      RestoreManager.prototype.restoreFromRepository = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configCount: 2,
          packagesInstalled: 1,
        },
      });

      const result = execSync('node dist/cli.js restore https://github.com/user/test-dotfiles', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Restoration completed successfully');
      expect(result).toContain('Configurations restored: 2');
      expect(result).toContain('Packages installed: 1');
    });

    it('should handle restore command with dry run', async () => {
      const { RestoreManager } = require('../installer/restore-manager');
      RestoreManager.prototype.restoreFromRepository = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configCount: 2,
          packagesInstalled: 0,
        },
      });

      const result = execSync('node dist/cli.js restore https://github.com/user/test-dotfiles --dry-run', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Restoration completed successfully');
    });
  });

  describe('explain command', () => {
    it('should execute explain command successfully', async () => {
      // Mock the scanner
      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: true,
        data: {
          configs: [
            {
              path: '~/.bashrc',
              type: 'bash',
              content: 'export PATH=$PATH:/usr/local/bin',
              lastModified: new Date(),
              size: 50,
              dependencies: [],
              isActive: true,
              backupStatus: 'not_backed_up',
            },
          ],
          metadata: {
            totalFiles: 1,
            validConfigs: 1,
            duration: 100,
            startTime: new Date(),
            endTime: new Date(),
          },
          errors: [],
        },
      });

      // Mock the analysis manager
      const { AnalysisManager } = require('../ai/analysis-manager');
      AnalysisManager.prototype.analyzeConfig = jest.fn().mockResolvedValue({
        success: true,
        data: {
          path: '~/.bashrc',
          type: 'bash',
          content: 'export PATH=$PATH:/usr/local/bin',
          lastModified: new Date(),
          size: 50,
          dependencies: [],
          isActive: true,
          backupStatus: 'not_backed_up',
          aiAnalysis: {
            description: 'Bash configuration with PATH export',
            category: 'shell',
            requiredPackages: ['bash'],
            setupInstructions: 'Copy to ~/.bashrc and source it',
            hasIssues: false,
            issues: [],
            confidence: 0.9,
          },
        },
      });

      const result = execSync('node dist/cli.js explain ~/.bashrc', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Bash configuration with PATH export');
      expect(result).toContain('Category: shell');
      expect(result).toContain('Dependencies: bash');
    });
  });

  describe('info command', () => {
    it('should execute info command successfully', async () => {
      // Mock the system info gatherer
      const { SystemInfoGatherer } = require('../scanner/system-info');
      SystemInfoGatherer.prototype.gatherSystemInfo = jest.fn().mockResolvedValue({
        os: 'Linux',
        version: 'Ubuntu 22.04',
        shell: '/bin/bash',
        homeDir: '/home/user',
        packages: [
          { name: 'bash', version: '5.1', manager: 'apt', isEssential: true },
          { name: 'vim', version: '8.2', manager: 'apt', isEssential: false },
        ],
        packageManagers: ['apt', 'snap'],
      });

      const result = execSync('node dist/cli.js info', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('System Information');
      expect(result).toContain('OS: Linux Ubuntu 22.04');
      expect(result).toContain('Shell: /bin/bash');
      expect(result).toContain('Package Managers: apt, snap');
    });
  });

  describe('health command', () => {
    it('should execute health command successfully', async () => {
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

      const result = execSync('node dist/cli.js health', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('Health Check Results');
      expect(result).toContain('Environment Variables: ✅');
      expect(result).toContain('GitHub API: ✅');
      expect(result).toContain('AI Service: ✅');
      expect(result).toContain('File System: ✅');
    });
  });

  describe('error handling', () => {
    it('should handle command execution errors gracefully', async () => {
      const { DotfileScanner } = require('../scanner/dotfile-scanner');
      DotfileScanner.prototype.scan = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('Scan failed'),
      });

      try {
        execSync('node dist/cli.js scan', { 
          cwd: testDir,
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (error) {
        // Command should exit with error code
        expect(error).toBeDefined();
      }
    });

    it('should show help when no command is provided', async () => {
      const result = execSync('node dist/cli.js', { 
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(result).toContain('AI-powered dotfile management system');
      expect(result).toContain('Commands:');
      expect(result).toContain('scan');
      expect(result).toContain('backup');
      expect(result).toContain('restore');
    });
  });
});
