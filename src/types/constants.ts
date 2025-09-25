/**
 * Constants and configuration values for DotSync
 */

import { ConfigType } from './index';

/**
 * Default paths to scan for dotfiles
 */
export const DEFAULT_SCAN_PATHS = [
  '~/.bashrc',
  '~/.bash_profile',
  '~/.bash_aliases',
  '~/.zshrc',
  '~/.zsh_profile',
  '~/.oh-my-zsh/custom',
  '~/.vimrc',
  '~/.nvimrc',
  '~/.gitconfig',
  '~/.gitignore_global',
  '~/.ssh/config',
  '~/.ssh/known_hosts',
  '~/.profile',
  '~/.inputrc',
  '~/.tmux.conf',
  '~/.screenrc',
] as const;

/**
 * File extensions and their corresponding config types
 */
export const CONFIG_TYPE_MAPPING: Record<string, ConfigType> = {
  '.bashrc': 'bash',
  '.bash_profile': 'bash',
  '.bash_aliases': 'bash',
  '.zshrc': 'zsh',
  '.zsh_profile': 'zsh',
  '.vimrc': 'vim',
  '.nvimrc': 'vim',
  '.gitconfig': 'git',
  '.gitignore_global': 'git',
  'config': 'ssh',
  'known_hosts': 'ssh',
  '.profile': 'system',
  '.inputrc': 'system',
  '.tmux.conf': 'system',
  '.screenrc': 'system',
} as const;

/**
 * Maximum file size to scan (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Supported file extensions for scanning
 */
export const SUPPORTED_EXTENSIONS = [
  '.rc',
  '.conf',
  '.config',
  '.profile',
  '.bashrc',
  '.zshrc',
  '.vimrc',
  '.nvimrc',
  '.gitconfig',
  '.gitignore',
  '.ssh',
  '.tmux',
  '.screen',
] as const;

/**
 * AI prompts for different analysis tasks
 */
export const AI_PROMPTS = {
  ANALYZE_CONFIG: `
    Analyze this configuration file and provide a structured response:
    
    File: {filename}
    Content: {content}
    
    Please provide:
    1. A brief description of what this configuration does
    2. The category it belongs to (shell/editor/git/system/development/productivity)
    3. Required packages or dependencies
    4. Setup instructions for a new machine
    5. Any potential issues or warnings
    6. A confidence score (0-1) for your analysis
    
    Respond in JSON format with these exact fields:
    {
      "description": "string",
      "category": "shell|editor|git|system|development|productivity",
      "requiredPackages": ["string"],
      "setupInstructions": "string",
      "hasIssues": boolean,
      "issues": ["string"],
      "confidence": number
    }
  `,
  
  GENERATE_SETUP_SCRIPT: `
    Generate a bash setup script for this configuration:
    
    Config: {config}
    Dependencies: {dependencies}
    
    The script should:
    1. Check if dependencies are installed
    2. Install missing packages
    3. Create backups of existing files
    4. Apply the configuration safely
    5. Verify the installation
    
    Return only the bash script content.
  `,
  
  EXPLAIN_CONFIG: `
    Explain this configuration file in simple terms:
    
    File: {filename}
    Content: {content}
    
    Provide a clear, non-technical explanation of:
    1. What this file does
    2. Why someone might want it
    3. How to use it
    4. Any important notes or warnings
  `,
  
  /**
   * Prompt for generating comprehensive documentation for configuration files
   * Includes overview, prerequisites, installation instructions, usage examples,
   * troubleshooting tips, and related configurations in Markdown format
   */
  GENERATE_DOCUMENTATION: `
    Generate comprehensive documentation for this configuration file:
    
    File: {filePath}
    Type: {type}
    Content: {content}
    
    Include:
    1. Overview of what this configuration does
    2. Prerequisites and dependencies
    3. Installation instructions
    4. Usage examples
    5. Troubleshooting tips
    6. Related configurations
    
    Format as Markdown.
  `,
} as const;

/**
 * GitHub repository structure
 */
export const REPO_STRUCTURE = {
  SHELL_DIR: 'shell',
  EDITOR_DIR: 'editors',
  GIT_DIR: 'git',
  SYSTEM_DIR: 'system',
  SCRIPTS_DIR: 'scripts',
  DOCS_DIR: 'docs',
} as const;

/**
 * Default commit messages
 */
export const COMMIT_MESSAGES = {
  INITIAL_BACKUP: 'feat: initial dotfile backup with AI analysis',
  UPDATE_BACKUP: 'feat: update dotfile backup',
  ADD_CONFIG: 'feat: add {type} configuration',
  UPDATE_CONFIG: 'feat: update {type} configuration',
  REMOVE_CONFIG: 'feat: remove {type} configuration',
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  FILE_NOT_FOUND: 'File not found: {path}',
  PERMISSION_DENIED: 'Permission denied: {path}',
  FILE_TOO_LARGE: 'File too large: {path} ({size} bytes)',
  PARSE_ERROR: 'Failed to parse file: {path}',
  AI_SERVICE_ERROR: 'AI service error: {message}',
  GITHUB_ERROR: 'GitHub API error: {message}',
  INVALID_CONFIG: 'Invalid configuration: {message}',
  MISSING_DEPENDENCIES: 'Missing dependencies: {dependencies}',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  SCAN_COMPLETE: 'Scan completed: {count} configurations found',
  BACKUP_COMPLETE: 'Backup completed: {repoUrl}',
  RESTORE_COMPLETE: 'Restore completed: {count} configurations applied',
  AI_ANALYSIS_COMPLETE: 'AI analysis completed for {count} configurations',
} as const;

/**
 * Log levels
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  SCAN_OPTIONS: {
    includeHidden: true,
    maxFileSize: MAX_FILE_SIZE,
    useAI: true,
    excludePatterns: ['*.log', '*.cache', '*.tmp'],
  },
  BACKUP_OPTIONS: {
    isPrivate: false,
    includeAI: true,
    createSetupScripts: true,
  },
  RESTORE_OPTIONS: {
    interactive: true,
    createBackups: true,
    installPackages: true,
    dryRun: false,
  },
} as const;

