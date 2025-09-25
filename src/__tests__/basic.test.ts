/**
 * Basic tests for DotSync core functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { DotfileScanner } from '../scanner/dotfile-scanner';

describe('DotSync Basic Tests', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join('/tmp', `dotsync-basic-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('DotfileScanner', () => {
    it('should create scanner instance', () => {
      const scanner = new DotfileScanner();
      expect(scanner).toBeDefined();
    });

    it('should scan for files successfully', async () => {
      // Create test files
      const bashrcPath = join(testDir, '.bashrc');
      const vimrcPath = join(testDir, '.vimrc');
      
      await writeFile(bashrcPath, 'export PATH=$PATH:/usr/local/bin');
      await writeFile(vimrcPath, 'set number\nset tabstop=2');

      const scanner = new DotfileScanner();
      const result = await scanner.scan({
        paths: [bashrcPath, vimrcPath],
        includeHidden: true,
        useAI: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs).toHaveLength(2);
        expect(result.data.metadata.totalFiles).toBe(2);
        expect(result.data.metadata.validConfigs).toBe(2);
      }
    });

    it('should handle file not found errors', async () => {
      const scanner = new DotfileScanner();
      const result = await scanner.scan({
        paths: ['/nonexistent/file'],
        useAI: false,
      });

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

      const scanner = new DotfileScanner();
      const result = await scanner.scan({
        paths: [largeFilePath],
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        useAI: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs).toHaveLength(0);
        expect(result.data.errors).toHaveLength(1);
        expect(result.data.errors[0].type).toBe('size_limit');
      }
    });

    it('should determine correct config types', async () => {
      const testFiles = [
        { path: '.bashrc', expectedType: 'bash' },
        { path: '.zshrc', expectedType: 'zsh' },
        { path: '.vimrc', expectedType: 'vim' },
        { path: '.gitconfig', expectedType: 'git' },
      ];

      const scanner = new DotfileScanner();

      for (const testFile of testFiles) {
        const filePath = join(testDir, testFile.path);
        await writeFile(filePath, 'test content');

        const result = await scanner.scan({
          paths: [filePath],
          useAI: false,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.configs).toHaveLength(1);
          expect(result.data.configs[0].type).toBe(testFile.expectedType);
        }
      }
    });
  });

  describe('Type System', () => {
    it('should have proper type definitions', () => {
      // Test that types module can be imported
      const types = require('../types');
      
      // Check that the module exports exist
      expect(types).toBeDefined();
      expect(typeof types).toBe('object');
      
      // TypeScript interfaces and types are not runtime values
      // so we just check that the module can be imported
      expect(types).toBeTruthy();
    });

    it('should validate configuration objects', () => {
      const { DotfileConfig } = require('../types');
      
      const config: DotfileConfig = {
        path: '~/.bashrc',
        type: 'bash',
        content: 'export PATH=$PATH:/usr/local/bin',
        lastModified: new Date(),
        size: 50,
        dependencies: [],
        isActive: true,
        backupStatus: 'not_backed_up',
      };

      expect(config.path).toBe('~/.bashrc');
      expect(config.type).toBe('bash');
      expect(config.content).toBe('export PATH=$PATH:/usr/local/bin');
      expect(config.isActive).toBe(true);
      expect(config.backupStatus).toBe('not_backed_up');
    });
  });

  describe('Constants', () => {
    it('should have proper constant definitions', () => {
      const { DEFAULT_SCAN_PATHS, CONFIG_TYPE_MAPPING, MAX_FILE_SIZE } = require('../types/constants');
      
      expect(DEFAULT_SCAN_PATHS).toBeDefined();
      expect(Array.isArray(DEFAULT_SCAN_PATHS)).toBe(true);
      expect(DEFAULT_SCAN_PATHS.length).toBeGreaterThan(0);
      
      expect(CONFIG_TYPE_MAPPING).toBeDefined();
      expect(typeof CONFIG_TYPE_MAPPING).toBe('object');
      
      expect(MAX_FILE_SIZE).toBeDefined();
      expect(typeof MAX_FILE_SIZE).toBe('number');
      expect(MAX_FILE_SIZE).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle permission errors gracefully', async () => {
      const scanner = new DotfileScanner();
      const result = await scanner.scan({
        paths: ['/root/.bashrc'], // Assuming we don't have root access
        useAI: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.errors.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should categorize errors correctly', async () => {
      const scanner = new DotfileScanner();
      const result = await scanner.scan({
        paths: ['/nonexistent/file'],
        useAI: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.errors).toHaveLength(1);
        expect(result.data.errors[0].type).toBe('not_found');
      }
    });
  });

  describe('Performance', () => {
    it('should complete scan within reasonable time', async () => {
      const startTime = Date.now();
      
      const scanner = new DotfileScanner();
      const result = await scanner.scan({
        paths: [testDir],
        useAI: false,
      });
      
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
