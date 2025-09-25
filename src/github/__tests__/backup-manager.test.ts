/**
 * Tests for BackupManager
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BackupManager } from '../backup-manager';
import { DotfileConfig, BackupOptions } from '../../types';

// Mock dependencies
jest.mock('../repository-manager');
jest.mock('../../ai/analysis-manager');

describe('BackupManager', () => {
  let backupManager: BackupManager;
  let mockConfigs: DotfileConfig[];

  beforeEach(() => {
    backupManager = new BackupManager();
    
    mockConfigs = [
      {
        path: '~/.bashrc',
        type: 'bash',
        content: 'export PATH=$PATH:/usr/local/bin',
        lastModified: new Date(),
        size: 50,
        dependencies: ['bash'],
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

  describe('createBackup', () => {
    it('should create backup successfully with AI analysis', async () => {
      // Mock repository creation
      const { RepositoryManager } = require('../repository-manager');
      RepositoryManager.prototype.createRepository = jest.fn().mockResolvedValue({
        success: true,
        data: {
          name: 'test-dotfiles',
          url: 'https://github.com/user/test-dotfiles',
          isPrivate: false,
          description: 'Test dotfiles',
          lastCommit: 'main',
          createdAt: new Date(),
        },
      });

      // Mock configuration upload
      RepositoryManager.prototype.uploadConfigurations = jest.fn().mockResolvedValue({
        success: true,
        data: 'https://github.com/user/test-dotfiles',
      });

      // Mock AI analysis
      const { AnalysisManager } = require('../../ai/analysis-manager');
      AnalysisManager.prototype.analyzeMultipleConfigs = jest.fn().mockResolvedValue({
        success: true,
        data: mockConfigs,
      });

      const options: BackupOptions = {
        repoName: 'test-dotfiles',
        isPrivate: false,
        includeAI: true,
        createSetupScripts: true,
      };

      const result = await backupManager.createBackup(mockConfigs, options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repoUrl).toBe('https://github.com/user/test-dotfiles');
        expect(result.data.configCount).toBe(2);
        expect(result.data.analysisCount).toBe(1);
      }

      expect(RepositoryManager.prototype.createRepository).toHaveBeenCalledWith(options);
      expect(AnalysisManager.prototype.analyzeMultipleConfigs).toHaveBeenCalledWith(mockConfigs);
    });

    it('should create backup without AI analysis', async () => {
      // Mock repository creation
      const { RepositoryManager } = require('../repository-manager');
      RepositoryManager.prototype.createRepository = jest.fn().mockResolvedValue({
        success: true,
        data: {
          name: 'test-dotfiles',
          url: 'https://github.com/user/test-dotfiles',
          isPrivate: false,
          description: 'Test dotfiles',
          lastCommit: 'main',
          createdAt: new Date(),
        },
      });

      // Mock configuration upload
      RepositoryManager.prototype.uploadConfigurations = jest.fn().mockResolvedValue({
        success: true,
        data: 'https://github.com/user/test-dotfiles',
      });

      const options: BackupOptions = {
        repoName: 'test-dotfiles',
        isPrivate: false,
        includeAI: false,
        createSetupScripts: false,
      };

      const result = await backupManager.createBackup(mockConfigs, options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configCount).toBe(2);
        expect(result.data.analysisCount).toBe(0);
      }
    });

    it('should handle repository creation failure', async () => {
      // Mock repository creation failure
      const { RepositoryManager } = require('../repository-manager');
      RepositoryManager.prototype.createRepository = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('Repository creation failed'),
      });

      const result = await backupManager.createBackup(mockConfigs, {});

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Repository creation failed');
    });

    it('should handle AI analysis failure gracefully', async () => {
      // Mock repository creation
      const { RepositoryManager } = require('../repository-manager');
      RepositoryManager.prototype.createRepository = jest.fn().mockResolvedValue({
        success: true,
        data: {
          name: 'test-dotfiles',
          url: 'https://github.com/user/test-dotfiles',
          isPrivate: false,
          description: 'Test dotfiles',
          lastCommit: 'main',
          createdAt: new Date(),
        },
      });

      // Mock configuration upload
      RepositoryManager.prototype.uploadConfigurations = jest.fn().mockResolvedValue({
        success: true,
        data: 'https://github.com/user/test-dotfiles',
      });

      // Mock AI analysis failure
      const { AnalysisManager } = require('../../ai/analysis-manager');
      AnalysisManager.prototype.analyzeMultipleConfigs = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('AI analysis failed'),
      });

      const options: BackupOptions = {
        includeAI: true,
      };

      const result = await backupManager.createBackup(mockConfigs, options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.analysisCount).toBe(0);
      }
    });

    it('should handle configuration upload failure', async () => {
      // Mock repository creation
      const { RepositoryManager } = require('../repository-manager');
      RepositoryManager.prototype.createRepository = jest.fn().mockResolvedValue({
        success: true,
        data: {
          name: 'test-dotfiles',
          url: 'https://github.com/user/test-dotfiles',
          isPrivate: false,
          description: 'Test dotfiles',
          lastCommit: 'main',
          createdAt: new Date(),
        },
      });

      // Mock configuration upload failure
      RepositoryManager.prototype.uploadConfigurations = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('Upload failed'),
      });

      const result = await backupManager.createBackup(mockConfigs, {});

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Upload failed');
    });
  });

  describe('updateBackup', () => {
    it('should update existing backup successfully', async () => {
      const repoUrl = 'https://github.com/user/test-dotfiles';

      // Mock AI analysis
      const { AnalysisManager } = require('../../ai/analysis-manager');
      AnalysisManager.prototype.analyzeMultipleConfigs = jest.fn().mockResolvedValue({
        success: true,
        data: mockConfigs,
      });

      // Mock configuration upload
      const { RepositoryManager } = require('../repository-manager');
      RepositoryManager.prototype.uploadConfigurations = jest.fn().mockResolvedValue({
        success: true,
        data: repoUrl,
      });

      const options: BackupOptions = {
        includeAI: true,
      };

      const result = await backupManager.updateBackup(repoUrl, mockConfigs, options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repoUrl).toBe(repoUrl);
        expect(result.data.updatedCount).toBe(2);
      }
    });

    it('should handle invalid repository URL', async () => {
      const result = await backupManager.updateBackup('invalid-url', mockConfigs, {});

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invalid repository URL');
    });
  });

  describe('getBackupSummary', () => {
    it('should get backup summary successfully', async () => {
      const repoUrl = 'https://github.com/user/test-dotfiles';

      const result = await backupManager.getBackupSummary(repoUrl);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repoName).toBe('test-dotfiles');
        expect(result.data.configCount).toBe(0); // Mock returns 0
        expect(result.data.lastUpdated).toBeInstanceOf(Date);
      }
    });

    it('should handle invalid repository URL', async () => {
      const result = await backupManager.getBackupSummary('invalid-url');

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invalid repository URL');
    });
  });

  describe('listBackups', () => {
    it('should list backups successfully', async () => {
      const result = await backupManager.listBackups();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup successfully', async () => {
      const repoUrl = 'https://github.com/user/test-dotfiles';

      const result = await backupManager.deleteBackup(repoUrl);

      expect(result.success).toBe(true);
    });

    it('should handle invalid repository URL', async () => {
      const result = await backupManager.deleteBackup('invalid-url');

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invalid repository URL');
    });
  });

  describe('parseRepoUrl', () => {
    it('should parse valid GitHub URLs', () => {
      const validUrls = [
        'https://github.com/user/repo',
        'https://github.com/user/repo.git',
        'git@github.com:user/repo.git',
      ];

      // Access private method through any cast for testing
      const manager = backupManager as any;
      
      validUrls.forEach(url => {
        const result = manager.parseRepoUrl(url);
        expect(result).not.toBeNull();
        expect(result.owner).toBe('user');
        expect(result.name).toBe('repo');
      });
    });

    it('should return null for invalid URLs', () => {
      const invalidUrls = [
        'not-a-github-url',
        'https://gitlab.com/user/repo',
        'invalid',
      ];

      // Access private method through any cast for testing
      const manager = backupManager as any;
      
      invalidUrls.forEach(url => {
        const result = manager.parseRepoUrl(url);
        expect(result).toBeNull();
      });
    });
  });
});
