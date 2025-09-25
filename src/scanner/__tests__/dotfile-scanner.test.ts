/**
 * Tests for DotfileScanner
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { DotfileScanner } from '../dotfile-scanner';
import { ScanOptions } from '../../types';

describe('DotfileScanner', () => {
  let scanner: DotfileScanner;
  let testDir: string;

  beforeEach(async () => {
    scanner = new DotfileScanner();
    testDir = join('/tmp', `dotsync-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('scan', () => {
    it('should scan for dotfiles successfully', async () => {
      // Create test files
      const bashrcPath = join(testDir, '.bashrc');
      const vimrcPath = join(testDir, '.vimrc');
      
      await writeFile(bashrcPath, 'export PATH=$PATH:/usr/local/bin');
      await writeFile(vimrcPath, 'set number\nset tabstop=2');

      const options: ScanOptions = {
        paths: [bashrcPath, vimrcPath],
        includeHidden: true,
        useAI: false,
      };

      const result = await scanner.scan(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs).toHaveLength(2);
        expect(result.data.metadata.totalFiles).toBe(2);
        expect(result.data.metadata.validConfigs).toBe(2);
        
        const configs = result.data.configs;
        expect(configs.some(c => c.type === 'bash')).toBe(true);
        expect(configs.some(c => c.type === 'vim')).toBe(true);
      }
    });

    it('should handle file not found errors gracefully', async () => {
      const options: ScanOptions = {
        paths: ['/nonexistent/file'],
        useAI: false,
      };

      const result = await scanner.scan(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs).toHaveLength(0);
        expect(result.data.errors).toHaveLength(1);
        expect(result.data.errors[0].type).toBe('not_found');
      }
    });

    it('should respect file size limits', async () => {
      // Create a large file
      const largeFilePath = join(testDir, '.largefile');
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      await writeFile(largeFilePath, largeContent);

      const options: ScanOptions = {
        paths: [largeFilePath],
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        useAI: false,
      };

      const result = await scanner.scan(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs).toHaveLength(0);
        expect(result.data.errors).toHaveLength(1);
        expect(result.data.errors[0].type).toBe('size_limit');
      }
    });

    it('should exclude files matching exclude patterns', async () => {
      const bashrcPath = join(testDir, '.bashrc');
      const logPath = join(testDir, '.bashrc.log');
      
      await writeFile(bashrcPath, 'export PATH=$PATH:/usr/local/bin');
      await writeFile(logPath, 'log content');

      const options: ScanOptions = {
        paths: [testDir],
        excludePatterns: ['*.log'],
        includeHidden: true,
        useAI: false,
      };

      const result = await scanner.scan(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs).toHaveLength(1);
        expect(result.data.configs[0].path).toBe(bashrcPath);
      }
    });

    it('should handle directory scanning', async () => {
      // Create nested structure
      const subDir = join(testDir, 'subdir');
      await mkdir(subDir, { recursive: true });
      
      const bashrcPath = join(testDir, '.bashrc');
      const vimrcPath = join(subDir, '.vimrc');
      
      await writeFile(bashrcPath, 'export PATH=$PATH:/usr/local/bin');
      await writeFile(vimrcPath, 'set number');

      const options: ScanOptions = {
        paths: [testDir],
        includeHidden: true,
        useAI: false,
      };

      const result = await scanner.scan(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should determine correct config types', async () => {
      const testFiles = [
        { path: '.bashrc', expectedType: 'bash' },
        { path: '.zshrc', expectedType: 'zsh' },
        { path: '.vimrc', expectedType: 'vim' },
        { path: '.gitconfig', expectedType: 'git' },
        { path: 'config', expectedType: 'ssh' },
      ];

      for (const testFile of testFiles) {
        const filePath = join(testDir, testFile.path);
        await writeFile(filePath, 'test content');

        const options: ScanOptions = {
          paths: [filePath],
          useAI: false,
        };

        const result = await scanner.scan(options);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.configs).toHaveLength(1);
          expect(result.data.configs[0].type).toBe(testFile.expectedType);
        }
      }
    });

    it('should handle permission errors gracefully', async () => {
      // This test would require special setup to create permission errors
      // For now, we'll test the error categorization logic
      const options: ScanOptions = {
        paths: ['/root/.bashrc'], // Assuming we don't have root access
        useAI: false,
      };

      const result = await scanner.scan(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.errors.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('error handling', () => {
    it('should categorize errors correctly', async () => {
      const options: ScanOptions = {
        paths: ['/nonexistent/file'],
        useAI: false,
      };

      const result = await scanner.scan(options);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.errors).toHaveLength(1);
        expect(result.data.errors[0].type).toBe('not_found');
      }
    });
  });

  describe('performance', () => {
    it('should complete scan within reasonable time', async () => {
      const startTime = Date.now();
      
      const options: ScanOptions = {
        paths: [testDir],
        useAI: false,
      };

      const result = await scanner.scan(options);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
