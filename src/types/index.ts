/**
 * Core types and interfaces for DotSync
 * Defines the data structures used throughout the application
 */

export interface DotfileConfig {
  /** Full path to the configuration file */
  path: string;
  /** Type of configuration file */
  type: ConfigType;
  /** Raw content of the file */
  content: string;
  /** Last modification date */
  lastModified: Date;
  /** File size in bytes */
  size: number;
  /** Dependencies required for this config */
  dependencies: string[];
  /** AI analysis of the configuration */
  aiAnalysis?: ConfigAnalysis;
  /** Whether this config is currently active/used */
  isActive: boolean;
  /** Backup status */
  backupStatus: BackupStatus;
}

export type ConfigType = 
  | 'bash' 
  | 'zsh' 
  | 'vim' 
  | 'git' 
  | 'ssh' 
  | 'vscode' 
  | 'system' 
  | 'custom';

export interface ConfigAnalysis {
  /** Human-readable description of what this config does */
  description: string;
  /** Category this config belongs to */
  category: ConfigCategory;
  /** Required packages or dependencies */
  requiredPackages: string[];
  /** Setup instructions for this config */
  setupInstructions: string;
  /** Whether this config has any issues or warnings */
  hasIssues: boolean;
  /** Issues or warnings found */
  issues: string[];
  /** Confidence score for the analysis (0-1) */
  confidence: number;
}

export type ConfigCategory = 
  | 'shell' 
  | 'editor' 
  | 'git' 
  | 'system' 
  | 'development' 
  | 'productivity';

export type BackupStatus = 
  | 'not_backed_up' 
  | 'pending' 
  | 'backed_up' 
  | 'error';

export interface ScanOptions {
  /** Specific paths to scan */
  paths?: string[];
  /** Whether to include hidden files */
  includeHidden?: boolean;
  /** Maximum file size to scan (in bytes) */
  maxFileSize?: number;
  /** File patterns to exclude */
  excludePatterns?: string[];
  /** Whether to use AI analysis */
  useAI?: boolean;
}

export interface ScanResult {
  /** All discovered configurations */
  configs: DotfileConfig[];
  /** Scan metadata */
  metadata: ScanMetadata;
  /** Any errors encountered during scanning */
  errors: ScanError[];
}

export interface ScanMetadata {
  /** Total number of files scanned */
  totalFiles: number;
  /** Number of valid configurations found */
  validConfigs: number;
  /** Scan duration in milliseconds */
  duration: number;
  /** Timestamp when scan started */
  startTime: Date;
  /** Timestamp when scan completed */
  endTime: Date;
}

export interface ScanError {
  /** Path of the file that caused the error */
  path: string;
  /** Error message */
  message: string;
  /** Error type */
  type: 'permission' | 'not_found' | 'parse_error' | 'size_limit' | 'unknown';
  /** Error name */
  name: string;
}

export interface GitHubRepo {
  /** Repository name */
  name: string;
  /** Repository URL */
  url: string;
  /** Whether the repo is private */
  isPrivate: boolean;
  /** Repository description */
  description: string;
  /** Last commit hash */
  lastCommit: string;
  /** Repository creation date */
  createdAt: Date;
}

export interface BackupOptions {
  /** Repository name for backup */
  repoName?: string;
  /** Whether to make the repository private */
  isPrivate?: boolean;
  /** Commit message for the backup */
  commitMessage?: string;
  /** Whether to include AI analysis */
  includeAI?: boolean;
  /** Whether to create setup scripts */
  createSetupScripts?: boolean;
}

export interface RestoreOptions {
  /** Repository URL to restore from */
  repoUrl: string;
  /** Whether to run in interactive mode */
  interactive?: boolean;
  /** Whether to create backups of existing files */
  createBackups?: boolean;
  /** Whether to install required packages */
  installPackages?: boolean;
  /** Whether to run in dry-run mode */
  dryRun?: boolean;
}

export interface PackageInfo {
  /** Package name */
  name: string;
  /** Installed version */
  version: string;
  /** Package manager used */
  manager: 'apt' | 'snap' | 'flatpak' | 'pip' | 'npm' | 'yarn';
  /** Whether the package is essential */
  isEssential: boolean;
}

export interface SystemInfo {
  /** Operating system */
  os: string;
  /** OS version */
  version: string;
  /** Shell being used */
  shell: string;
  /** Home directory */
  homeDir: string;
  /** Installed packages */
  packages: PackageInfo[];
  /** Available package managers */
  packageManagers: string[];
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Custom error types
 */
export class ConfigParseError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ConfigParseError';
  }
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

export class ScanErrorClass extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ScanError';
  }
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  googleApiKey: string;
  githubToken: string;
  nodeEnv: 'development' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * CLI command options
 */
export interface CLIOptions {
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
  interactive?: boolean;
  output?: string;
}
