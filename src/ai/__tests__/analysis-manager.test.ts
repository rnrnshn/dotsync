/**
 * Tests for AnalysisManager
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AnalysisManager } from '../analysis-manager';
import { DotfileConfig, ConfigAnalysis } from '../../types';

// Mock the GeminiService
jest.mock('../gemini-service');
jest.mock('../../parsers/parser-factory');

describe('AnalysisManager', () => {
  let analysisManager: AnalysisManager;
  let mockConfig: DotfileConfig;

  beforeEach(() => {
    analysisManager = new AnalysisManager();
    
    mockConfig = {
      path: '~/.bashrc',
      type: 'bash',
      content: 'export PATH=$PATH:/usr/local/bin\nalias ll="ls -la"',
      lastModified: new Date(),
      size: 50,
      dependencies: [],
      isActive: true,
      backupStatus: 'not_backed_up',
    };
  });

  describe('analyzeConfig', () => {
    it('should analyze a single configuration successfully', async () => {
      // Mock the AI service response
      const mockAnalysis: ConfigAnalysis = {
        description: 'Bash configuration with PATH export and alias',
        category: 'shell',
        requiredPackages: ['bash'],
        setupInstructions: 'Copy to ~/.bashrc and source it',
        hasIssues: false,
        issues: [],
        confidence: 0.9,
      };

      // Mock the GeminiService
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.analyzeConfig = jest.fn().mockResolvedValue({
        success: true,
        data: mockAnalysis,
      });

      // Mock the parser
      const { ParserFactory } = require('../../parsers/parser-factory');
      const mockParser = {
        parse: jest.fn().mockReturnValue({ success: true }),
        extractDependencies: jest.fn().mockReturnValue(['bash']),
      };
      ParserFactory.getParser = jest.fn().mockReturnValue(mockParser);

      const result = await analysisManager.analyzeConfig(mockConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aiAnalysis).toEqual(mockAnalysis);
        expect(result.data.backupStatus).toBe('pending');
        expect(result.data.dependencies).toEqual(['bash']);
      }
    });

    it('should handle AI analysis failures gracefully', async () => {
      // Mock AI service failure
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.analyzeConfig = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('AI service unavailable'),
      });

      const result = await analysisManager.analyzeConfig(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('AI service unavailable');
    });

    it('should handle parser failures gracefully', async () => {
      // Mock parser failure
      const { ParserFactory } = require('../../parsers/parser-factory');
      const mockParser = {
        parse: jest.fn().mockReturnValue({ success: false, error: new Error('Parse failed') }),
        extractDependencies: jest.fn().mockReturnValue([]),
      };
      ParserFactory.getParser = jest.fn().mockReturnValue(mockParser);

      // Mock successful AI analysis
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.analyzeConfig = jest.fn().mockResolvedValue({
        success: true,
        data: {
          description: 'Test config',
          category: 'shell',
          requiredPackages: [],
          setupInstructions: 'Test instructions',
          hasIssues: false,
          issues: [],
          confidence: 0.8,
        },
      });

      const result = await analysisManager.analyzeConfig(mockConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dependencies).toEqual([]);
      }
    });
  });

  describe('analyzeMultipleConfigs', () => {
    it('should analyze multiple configurations in batches', async () => {
      const configs = [
        { ...mockConfig, path: '~/.bashrc' },
        { ...mockConfig, path: '~/.vimrc', type: 'vim' },
        { ...mockConfig, path: '~/.gitconfig', type: 'git' },
      ];

      // Mock successful AI analysis
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.analyzeConfig = jest.fn().mockResolvedValue({
        success: true,
        data: {
          description: 'Test config',
          category: 'shell',
          requiredPackages: [],
          setupInstructions: 'Test instructions',
          hasIssues: false,
          issues: [],
          confidence: 0.8,
        },
      });

      // Mock parser
      const { ParserFactory } = require('../../parsers/parser-factory');
      const mockParser = {
        parse: jest.fn().mockReturnValue({ success: true }),
        extractDependencies: jest.fn().mockReturnValue([]),
      };
      ParserFactory.getParser = jest.fn().mockReturnValue(mockParser);

      const result = await analysisManager.analyzeMultipleConfigs(configs);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data.every(config => config.aiAnalysis)).toBe(true);
      }
    });

    it('should handle partial failures in batch analysis', async () => {
      const configs = [
        { ...mockConfig, path: '~/.bashrc' },
        { ...mockConfig, path: '~/.vimrc', type: 'vim' },
      ];

      // Mock mixed success/failure
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.analyzeConfig = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          data: {
            description: 'Bash config',
            category: 'shell',
            requiredPackages: [],
            setupInstructions: 'Test instructions',
            hasIssues: false,
            issues: [],
            confidence: 0.8,
          },
        })
        .mockResolvedValueOnce({
          success: false,
          error: new Error('AI analysis failed'),
        });

      // Mock parser
      const { ParserFactory } = require('../../parsers/parser-factory');
      const mockParser = {
        parse: jest.fn().mockReturnValue({ success: true }),
        extractDependencies: jest.fn().mockReturnValue([]),
      };
      ParserFactory.getParser = jest.fn().mockReturnValue(mockParser);

      const result = await analysisManager.analyzeMultipleConfigs(configs);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].path).toBe('~/.bashrc');
      }
    });

    it('should handle all failures in batch analysis', async () => {
      const configs = [
        { ...mockConfig, path: '~/.bashrc' },
        { ...mockConfig, path: '~/.vimrc', type: 'vim' },
      ];

      // Mock all failures
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.analyzeConfig = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('AI service unavailable'),
      });

      const result = await analysisManager.analyzeMultipleConfigs(configs);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('All analyses failed');
    });
  });

  describe('getAnalysisSummary', () => {
    it('should generate analysis summary correctly', async () => {
      const configs = [
        {
          ...mockConfig,
          path: '~/.bashrc',
          aiAnalysis: {
            description: 'Bash config',
            category: 'shell',
            requiredPackages: ['bash'],
            setupInstructions: 'Test instructions',
            hasIssues: false,
            issues: [],
            confidence: 0.8,
          },
        },
        {
          ...mockConfig,
          path: '~/.vimrc',
          type: 'vim',
          aiAnalysis: {
            description: 'Vim config',
            category: 'editor',
            requiredPackages: ['vim'],
            setupInstructions: 'Test instructions',
            hasIssues: true,
            issues: ['Missing plugin'],
            confidence: 0.7,
          },
        },
      ];

      // Mock multi-config analysis
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.analyzeMultipleConfigs = jest.fn().mockResolvedValue({
        success: true,
        data: {
          recommendations: ['Add more aliases'],
          conflicts: [],
          improvements: ['Update vim plugins'],
        },
      });

      const result = await analysisManager.getAnalysisSummary(configs);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalConfigs).toBe(2);
        expect(result.data.analyzedConfigs).toBe(2);
        expect(result.data.categories.shell).toBe(1);
        expect(result.data.categories.editor).toBe(1);
        expect(result.data.totalDependencies).toContain('bash');
        expect(result.data.totalDependencies).toContain('vim');
        expect(result.data.issues).toContain('Missing plugin');
        expect(result.data.recommendations).toContain('Add more aliases');
      }
    });
  });

  describe('generateSetupScripts', () => {
    it('should generate setup scripts for configurations', async () => {
      const configs = [
        {
          ...mockConfig,
          aiAnalysis: {
            description: 'Bash config',
            category: 'shell',
            requiredPackages: ['bash'],
            setupInstructions: 'Test instructions',
            hasIssues: false,
            issues: [],
            confidence: 0.8,
          },
        },
      ];

      // Mock AI service
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.generateSetupScript = jest.fn().mockResolvedValue({
        success: true,
        data: '#!/bin/bash\necho "Setting up bash config"',
      });

      const result = await analysisManager.generateSetupScripts(configs);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['~/.bashrc']).toContain('#!/bin/bash');
      }
    });
  });

  describe('generateDocumentation', () => {
    it('should generate documentation for configurations', async () => {
      const configs = [
        {
          ...mockConfig,
          aiAnalysis: {
            description: 'Bash config',
            category: 'shell',
            requiredPackages: ['bash'],
            setupInstructions: 'Test instructions',
            hasIssues: false,
            issues: [],
            confidence: 0.8,
          },
        },
      ];

      // Mock AI service
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.generateDocumentation = jest.fn().mockResolvedValue({
        success: true,
        data: '# Bash Configuration\n\nThis file contains...',
      });

      const result = await analysisManager.generateDocumentation(configs);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['~/.bashrc']).toContain('# Bash Configuration');
      }
    });
  });

  describe('isAIAvailable', () => {
    it('should check AI service availability', async () => {
      // Mock AI service health check
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.healthCheck = jest.fn().mockResolvedValue({
        success: true,
        data: true,
      });

      const result = await analysisManager.isAIAvailable();

      expect(result).toBe(true);
    });

    it('should handle AI service unavailability', async () => {
      // Mock AI service failure
      const { GeminiService } = require('../gemini-service');
      GeminiService.prototype.healthCheck = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('Service unavailable'),
      });

      const result = await analysisManager.isAIAvailable();

      expect(result).toBe(false);
    });
  });
});
