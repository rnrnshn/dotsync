/**
 * Test setup and utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';

// Global test setup
beforeAll(async () => {
  // Set up test environment
  process.env.NODE_ENV = 'test';
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';
  process.env.GITHUB_TOKEN = 'test-token';
  process.env.LOG_LEVEL = 'error';
  
  // Create test directories
  const testDirs = [
    '/tmp/dotsync-test',
    '/tmp/dotsync-test-configs',
    '/tmp/dotsync-test-repos',
  ];
  
  for (const dir of testDirs) {
    try {
      await mkdir(dir, { recursive: true });
    } catch {
      // Ignore if directory already exists
    }
  }
});

afterAll(async () => {
  // Clean up test directories
  const testDirs = [
    '/tmp/dotsync-test',
    '/tmp/dotsync-test-configs',
    '/tmp/dotsync-test-repos',
  ];
  
  for (const dir of testDirs) {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});

// Test utilities
export const createTestConfig = (overrides: any = {}) => ({
  path: '~/.bashrc',
  type: 'bash',
  content: 'export PATH=$PATH:/usr/local/bin',
  lastModified: new Date(),
  size: 50,
  dependencies: [],
  isActive: true,
  backupStatus: 'not_backed_up' as const,
  ...overrides,
});

export const createTestAnalysis = (overrides: any = {}) => ({
  description: 'Test configuration',
  category: 'shell' as const,
  requiredPackages: ['bash'],
  setupInstructions: 'Copy to ~/.bashrc',
  hasIssues: false,
  issues: [],
  confidence: 0.8,
  ...overrides,
});

export const createTestRepo = (overrides: any = {}) => ({
  name: 'test-dotfiles',
  url: 'https://github.com/user/test-dotfiles',
  isPrivate: false,
  description: 'Test dotfiles repository',
  lastCommit: 'main',
  createdAt: new Date(),
  ...overrides,
});

export const createTestSystemInfo = (overrides: any = {}) => ({
  os: 'Linux',
  version: 'Ubuntu 22.04',
  shell: '/bin/bash',
  homeDir: '/home/test',
  packages: [
    { name: 'bash', version: '5.1', manager: 'apt' as const, isEssential: true },
    { name: 'vim', version: '8.2', manager: 'apt' as const, isEssential: false },
  ],
  packageManagers: ['apt', 'snap'],
  ...overrides,
});

export const createTestScanResult = (configs: any[] = [], errors: any[] = []) => ({
  configs,
  metadata: {
    totalFiles: configs.length,
    validConfigs: configs.length,
    duration: 100,
    startTime: new Date(),
    endTime: new Date(),
  },
  errors,
});

export const createTestBackupResult = (overrides: any = {}) => ({
  repoUrl: 'https://github.com/user/test-dotfiles',
  configCount: 1,
  analysisCount: 1,
  ...overrides,
});

export const createTestRestoreResult = (overrides: any = {}) => ({
  configCount: 1,
  packagesInstalled: 1,
  ...overrides,
});

// Mock utilities
export const mockSuccessfulResult = <T>(data: T) => ({
  success: true,
  data,
});

export const mockErrorResult = (error: Error) => ({
  success: false,
  error,
});

// Test file utilities
export const createTestFile = async (path: string, content: string) => {
  const { writeFile, mkdir } = await import('fs/promises');
  const { dirname } = await import('path');
  
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
};

export const cleanupTestFile = async (path: string) => {
  const { rm } = await import('fs/promises');
  
  try {
    await rm(path, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
};

// Test timeout utilities
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
};

// Test data generators
export const generateTestConfigs = (count: number) => {
  return Array.from({ length: count }, (_, i) => createTestConfig({
    path: `~/.config${i}`,
    type: i % 2 === 0 ? 'bash' : 'vim',
    content: `# Configuration ${i}\nexport VAR${i}=value${i}`,
  }));
};

export const generateTestErrors = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    path: `~/.config${i}`,
    message: `Error ${i}`,
    type: 'permission' as const,
    name: 'ScanError',
  }));
};

// Test assertion utilities
export const expectSuccessfulResult = <T>(result: { success: boolean; data?: T; error?: Error }) => {
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  expect(result.error).toBeUndefined();
  return result.data!;
};

export const expectErrorResult = (result: { success: boolean; data?: any; error?: Error }) => {
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  expect(result.data).toBeUndefined();
  return result.error!;
};

// Test environment utilities
export const setTestEnv = (env: Record<string, string>) => {
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
};

export const clearTestEnv = (keys: string[]) => {
  keys.forEach(key => {
    delete process.env[key];
  });
};
