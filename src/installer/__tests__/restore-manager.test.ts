/**
 * Tests for RestoreManager
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { execSync } from 'child_process';
import { readFile, writeFile, mkdir, rm, stat } from 'fs/promises';
import { join } from 'path';
import { RestoreManager } from '../restore-manager';
import { RestoreOptions, DotfileConfig } from '../../types';

// Mock child_process
jest.mock('child_process');

describe('RestoreManager', () => {
  let restoreManager: RestoreManager;
  let testDir: string;
  let mockConfigs: DotfileConfig[];

  beforeEach(async () => {
    restoreManager = new RestoreManager();
    testDir = join('/tmp', `dotsync-restore-test-${Date.now()}`);
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
          description: 'Bash configuration',
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
        content: 'set number\nset tabstop=2',
        lastModified: new Date(),
        size: 30,
        dependencies: ['vim'],
        isActive: true,
        backupStatus: 'not_backed_up',
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

  describe('restoreFromRepository', () => {
    it('should restore configurations successfully', async () => {
      // Mock git clone
      const { execSync } = require('child_process');
      execSync.mockImplementation((command) => {
        if (command.includes('git clone')) {
          // Create mock repository structure
          const repoPath = command.split(' ')[2];
          mkdir(join(repoPath, 'shell'), { recursive: true });
          mkdir(join(repoPath, 'editors'), { recursive: true });
          writeFile(join(repoPath, 'shell', '.bashrc'), 'export PATH=$PATH:/usr/local/bin');
          writeFile(join(repoPath, 'editors', '.vimrc'), 'set number');
        }
        return 'success';
      });

      const options: RestoreOptions = {
        repoUrl: 'https://github.com/user/test-dotfiles',
        interactive: false,
        createBackups: true,
        installPackages: true,
        dryRun: false,
      };

      const result = await restoreManager.restoreFromRepository(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configCount).toBeGreaterThanOrEqual(0);
        expect(result.data.packagesInstalled).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle repository cloning failure', async () => {
      const { execSync } = require('child_process');
      execSync.mockImplementation((command) => {
        if (command.includes('git clone')) {
          throw new Error('Repository not found');
        }
        return 'success';
      });

      const options: RestoreOptions = {
        repoUrl: 'https://github.com/user/nonexistent',
        interactive: false,
        createBackups: false,
        installPackages: false,
        dryRun: false,
      };

      const result = await restoreManager.restoreFromRepository(options);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Failed to clone repository');
    });

    it('should handle dry run mode', async () => {
      const { execSync } = require('child_process');
      execSync.mockImplementation((command) => {
        if (command.includes('git clone')) {
          // Create mock repository structure
          const repoPath = command.split(' ')[2];
          mkdir(join(repoPath, 'shell'), { recursive: true });
          writeFile(join(repoPath, 'shell', '.bashrc'), 'export PATH=$PATH:/usr/local/bin');
        }
        return 'success';
      });

      const options: RestoreOptions = {
        repoUrl: 'https://github.com/user/test-dotfiles',
        interactive: false,
        createBackups: false,
        installPackages: false,
        dryRun: true,
      };

      const result = await restoreManager.restoreFromRepository(options);

      expect(result.success).toBe(true);
    });

    it('should install packages when requested', async () => {
      const { execSync } = require('child_process');
      execSync.mockImplementation((command) => {
        if (command.includes('git clone')) {
          const repoPath = command.split(' ')[2];
          mkdir(join(repoPath, 'shell'), { recursive: true });
          writeFile(join(repoPath, 'shell', '.bashrc'), 'export PATH=$PATH:/usr/local/bin');
        } else if (command.includes('sudo apt install')) {
          return 'success';
        }
        return 'success';
      });

      const options: RestoreOptions = {
        repoUrl: 'https://github.com/user/test-dotfiles',
        interactive: false,
        createBackups: false,
        installPackages: true,
        dryRun: false,
      };

      const result = await restoreManager.restoreFromRepository(options);

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('sudo apt install'), expect.any(Object));
    });

    it('should create backups when requested', async () => {
      // Create existing file to backup
      const existingBashrc = join(testDir, '.bashrc');
      await writeFile(existingBashrc, 'existing content');

      const { execSync } = require('child_process');
      execSync.mockImplementation((command) => {
        if (command.includes('git clone')) {
          const repoPath = command.split(' ')[2];
          mkdir(join(repoPath, 'shell'), { recursive: true });
          writeFile(join(repoPath, 'shell', '.bashrc'), 'new content');
        }
        return 'success';
      });

      const options: RestoreOptions = {
        repoUrl: 'https://github.com/user/test-dotfiles',
        interactive: false,
        createBackups: true,
        installPackages: false,
        dryRun: false,
      };

      const result = await restoreManager.restoreFromRepository(options);

      expect(result.success).toBe(true);
    });

    it('should run setup scripts when available', async () => {
      const { execSync } = require('child_process');
      execSync.mockImplementation((command) => {
        if (command.includes('git clone')) {
          const repoPath = command.split(' ')[2];
          mkdir(join(repoPath, 'shell'), { recursive: true });
          writeFile(join(repoPath, 'shell', '.bashrc'), 'export PATH=$PATH:/usr/local/bin');
          writeFile(join(repoPath, 'setup.sh'), '#!/bin/bash\necho "Setting up dotfiles"');
        } else if (command.includes('bash setup.sh')) {
          return 'success';
        }
        return 'success';
      });

      const options: RestoreOptions = {
        repoUrl: 'https://github.com/user/test-dotfiles',
        interactive: false,
        createBackups: false,
        installPackages: false,
        dryRun: false,
      };

      const result = await restoreManager.restoreFromRepository(options);

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('bash setup.sh'), expect.any(Object));
    });
  });

  describe('readConfigurations', () => {
    it('should read configurations from organized directories', async () => {
      // Create mock repository structure
      const shellDir = join(testDir, 'shell');
      const editorsDir = join(testDir, 'editors');
      await mkdir(shellDir, { recursive: true });
      await mkdir(editorsDir, { recursive: true });

      await writeFile(join(shellDir, '.bashrc'), 'export PATH=$PATH:/usr/local/bin');
      await writeFile(join(editorsDir, '.vimrc'), 'set number');

      // Access private method for testing
      const manager = restoreManager as any;
      const configs = await manager.readConfigurations(testDir);

      expect(configs).toHaveLength(2);
      expect(configs.some(c => c.type === 'bash')).toBe(true);
      expect(configs.some(c => c.type === 'vim')).toBe(true);
    });

    it('should handle missing category directories gracefully', async () => {
      // Create empty directory
      await mkdir(testDir, { recursive: true });

      // Access private method for testing
      const manager = restoreManager as any;
      const configs = await manager.readConfigurations(testDir);

      expect(configs).toHaveLength(0);
    });
  });

  describe('installPackages', () => {
    it('should install packages from configurations', async () => {
      const { execSync } = require('child_process');
      execSync.mockImplementation((command) => {
        if (command.includes('sudo apt install')) {
          return 'success';
        }
        return 'success';
      });

      const configs = [
        {
          ...mockConfigs[0],
          aiAnalysis: {
            description: 'Bash config',
            category: 'shell',
            requiredPackages: ['bash', 'curl'],
            setupInstructions: 'Test',
            hasIssues: false,
            issues: [],
            confidence: 0.8,
          },
        },
      ];

      // Access private method for testing
      const manager = restoreManager as any;
      const packagesInstalled = await manager.installPackages(configs, false);

      expect(packagesInstalled).toBe(2);
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('sudo apt install'), expect.any(Object));
    });

    it('should handle package installation failures gracefully', async () => {
      const { execSync } = require('child_process');
      execSync.mockImplementation((command) => {
        if (command.includes('sudo apt install')) {
          throw new Error('Package installation failed');
        }
        return 'success';
      });

      const configs = [
        {
          ...mockConfigs[0],
          aiAnalysis: {
            description: 'Bash config',
            category: 'shell',
            requiredPackages: ['bash'],
            setupInstructions: 'Test',
            hasIssues: false,
            issues: [],
            confidence: 0.8,
          },
        },
      ];

      // Access private method for testing
      const manager = restoreManager as any;
      const packagesInstalled = await manager.installPackages(configs, false);

      expect(packagesInstalled).toBe(0);
    });

    it('should skip package installation in dry run mode', async () => {
      const configs = [
        {
          ...mockConfigs[0],
          aiAnalysis: {
            description: 'Bash config',
            category: 'shell',
            requiredPackages: ['bash'],
            setupInstructions: 'Test',
            hasIssues: false,
            issues: [],
            confidence: 0.8,
          },
        },
      ];

      // Access private method for testing
      const manager = restoreManager as any;
      const packagesInstalled = await manager.installPackages(configs, true);

      expect(packagesInstalled).toBe(1); // Should return count without installing
    });
  });

  describe('createBackups', () => {
    it('should create backups of existing files', async () => {
      // Create existing file
      const existingFile = join(testDir, '.bashrc');
      await writeFile(existingFile, 'existing content');

      const configs = [
        {
          ...mockConfigs[0],
          path: existingFile,
        },
      ];

      // Access private method for testing
      const manager = restoreManager as any;
      await manager.createBackups(configs);

      // Check if backup was created
      const files = await require('fs/promises').readdir(testDir);
      const backupFile = files.find(f => f.includes('.backup.'));
      expect(backupFile).toBeDefined();
    });

    it('should handle missing files gracefully', async () => {
      const configs = [
        {
          ...mockConfigs[0],
          path: join(testDir, 'nonexistent'),
        },
      ];

      // Access private method for testing
      const manager = restoreManager as any;
      await expect(manager.createBackups(configs)).resolves.not.toThrow();
    });
  });

  describe('installConfigurations', () => {
    it('should install configuration files', async () => {
      const configs = [
        {
          ...mockConfigs[0],
          path: join(testDir, '.bashrc'),
        },
      ];

      // Access private method for testing
      const manager = restoreManager as any;
      const installedCount = await manager.installConfigurations(configs, false);

      expect(installedCount).toBe(1);

      // Check if file was created
      const content = await readFile(join(testDir, '.bashrc'), 'utf8');
      expect(content).toBe(mockConfigs[0].content);
    });

    it('should handle dry run mode', async () => {
      const configs = [
        {
          ...mockConfigs[0],
          path: join(testDir, '.bashrc'),
        },
      ];

      // Access private method for testing
      const manager = restoreManager as any;
      const installedCount = await manager.installConfigurations(configs, true);

      expect(installedCount).toBe(1);

      // Check if file was NOT created in dry run
      try {
        await readFile(join(testDir, '.bashrc'), 'utf8');
        fail('File should not exist in dry run mode');
      } catch {
        // Expected - file should not exist
      }
    });

    it('should set appropriate permissions for SSH files', async () => {
      const { execSync } = require('child_process');
      execSync.mockImplementation(() => 'success');

      const configs = [
        {
          ...mockConfigs[0],
          path: join(testDir, '.ssh/config'),
        },
      ];

      // Access private method for testing
      const manager = restoreManager as any;
      await manager.installConfigurations(configs, false);

      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('chmod 600'), expect.any(Object));
    });

    it('should set executable permissions for bin files', async () => {
      const { execSync } = require('child_process');
      execSync.mockImplementation(() => 'success');

      const configs = [
        {
          ...mockConfigs[0],
          path: join(testDir, 'bin/script'),
        },
      ];

      // Access private method for testing
      const manager = restoreManager as any;
      await manager.installConfigurations(configs, false);

      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('chmod +x'), expect.any(Object));
    });
  });

  describe('utility methods', () => {
    it('should determine target paths correctly', async () => {
      const manager = restoreManager as any;

      expect(manager.determineTargetPath('.bashrc', 'shell')).toBe('~/.bashrc');
      expect(manager.determineTargetPath('.zshrc', 'shell')).toBe('~/.zshrc');
      expect(manager.determineTargetPath('.vimrc', 'editors')).toBe('~/.vimrc');
      expect(manager.determineTargetPath('.gitconfig', 'git')).toBe('~/.gitconfig');
      expect(manager.determineTargetPath('config', 'ssh')).toBe('~/.ssh/config');
    });

    it('should determine configuration types correctly', async () => {
      const manager = restoreManager as any;

      expect(manager.determineConfigType('.bashrc', 'shell')).toBe('bash');
      expect(manager.determineConfigType('.zshrc', 'shell')).toBe('zsh');
      expect(manager.determineConfigType('.vimrc', 'editors')).toBe('vim');
      expect(manager.determineConfigType('.gitconfig', 'git')).toBe('git');
      expect(manager.determineConfigType('config', 'ssh')).toBe('ssh');
    });

    it('should resolve paths correctly', async () => {
      const manager = restoreManager as any;

      expect(manager.resolvePath('~/.bashrc')).toBe(join(process.env.HOME || '', '.bashrc'));
      expect(manager.resolvePath('/absolute/path')).toBe('/absolute/path');
    });
  });
});
