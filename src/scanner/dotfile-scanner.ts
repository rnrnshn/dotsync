/**
 * Dotfile discovery and scanning functionality
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, resolve, basename, extname } from 'path';
import { homedir } from 'os';
import {
  DotfileConfig,
  ScanOptions,
  ScanResult,
  ScanMetadata,
  ScanError,
  ConfigType,
  Result,
} from '../types';
import {
  DEFAULT_SCAN_PATHS,
  CONFIG_TYPE_MAPPING,
  MAX_FILE_SIZE,
  SUPPORTED_EXTENSIONS,
} from '../types/constants';

export class DotfileScanner {
  private readonly homeDir: string;

  constructor() {
    this.homeDir = homedir();
  }

  /**
   * Scan for dotfiles in the system
   */
  async scan(options: ScanOptions = {}): Promise<Result<ScanResult, Error>> {
    const startTime = new Date();
    const errors: ScanError[] = [];
    const configs: DotfileConfig[] = [];

    try {
      // Determine paths to scan
      const pathsToScan = options.paths || DEFAULT_SCAN_PATHS;
      
      // Process each path
      for (const path of pathsToScan) {
        const resolvedPath = this.resolvePath(path);
        const result = await this.scanPath(resolvedPath, options);
        
        if (result.success) {
          configs.push(...result.data);
        } else {
          errors.push({
            path: resolvedPath,
            message: result.error.message,
            type: this.categorizeError(result.error),
            name: result.error.name || 'ScanError',
          });
        }
      }

      const endTime = new Date();
      const metadata: ScanMetadata = {
        totalFiles: pathsToScan.length,
        validConfigs: configs.length,
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
      };

      return {
        success: true,
        data: {
          configs,
          metadata,
          errors,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Scan a specific path for configuration files
   */
  private async scanPath(
    path: string,
    options: ScanOptions
  ): Promise<Result<DotfileConfig[], Error>> {
    try {
      const stats = await stat(path);
      
      if (stats.isFile()) {
        return await this.scanFile(path, options);
      } else if (stats.isDirectory()) {
        return await this.scanDirectory(path, options);
      } else {
        return {
          success: false,
          error: new Error(`Path is neither file nor directory: ${path}`),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Scan a single file
   */
  private async scanFile(
    filePath: string,
    options: ScanOptions
  ): Promise<Result<DotfileConfig[], Error>> {
    try {
      // Check file size
      const stats = await stat(filePath);
      if (stats.size > (options.maxFileSize || MAX_FILE_SIZE)) {
        return {
          success: false,
          error: new Error(`File too large: ${stats.size} bytes`),
        };
      }

      // Read file content
      const content = await readFile(filePath, 'utf8');
      
      // Determine config type
      const configType = this.determineConfigType(filePath);
      if (!configType) {
        return { success: true, data: [] };
      }

      // Create config object
      const config: DotfileConfig = {
        path: filePath,
        type: configType,
        content,
        lastModified: stats.mtime,
        size: stats.size,
        dependencies: [],
        isActive: true,
        backupStatus: 'not_backed_up',
      };

      return { success: true, data: [config] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Scan a directory for configuration files
   */
  private async scanDirectory(
    dirPath: string,
    options: ScanOptions
  ): Promise<Result<DotfileConfig[], Error>> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      const configs: DotfileConfig[] = [];

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        // Skip hidden files if not requested
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        // Skip excluded patterns
        if (this.shouldExclude(fullPath, options.excludePatterns)) {
          continue;
        }

        if (entry.isFile()) {
          const result = await this.scanFile(fullPath, options);
          if (result.success) {
            configs.push(...result.data);
          }
        } else if (entry.isDirectory()) {
          const result = await this.scanDirectory(fullPath, options);
          if (result.success) {
            configs.push(...result.data);
          }
        }
      }

      return { success: true, data: configs };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Determine the configuration type based on file path
   */
  private determineConfigType(filePath: string): ConfigType | null {
    const fileName = basename(filePath);
    const extension = extname(filePath);
    
    // Check direct mapping
    if (fileName in CONFIG_TYPE_MAPPING) {
      return CONFIG_TYPE_MAPPING[fileName as keyof typeof CONFIG_TYPE_MAPPING];
    }

    // Check by extension
    if (extension && extension in CONFIG_TYPE_MAPPING) {
      return CONFIG_TYPE_MAPPING[extension as keyof typeof CONFIG_TYPE_MAPPING];
    }

    // Check if it's a supported extension
    if (SUPPORTED_EXTENSIONS.some(ext => fileName.includes(ext))) {
      return 'custom';
    }

    return null;
  }

  /**
   * Check if a path should be excluded
   */
  private shouldExclude(path: string, excludePatterns?: string[]): boolean {
    if (!excludePatterns) return false;
    
    return excludePatterns.some(pattern => {
      // Simple glob pattern matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(path);
    });
  }

  /**
   * Resolve a path (handle ~ expansion)
   */
  private resolvePath(path: string): string {
    if (path.startsWith('~')) {
      return join(this.homeDir, path.slice(1));
    }
    return resolve(path);
  }

  /**
   * Categorize an error for better error handling
   */
  private categorizeError(error: Error): ScanError['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission denied') || message.includes('eacces')) {
      return 'permission';
    }
    if (message.includes('no such file') || message.includes('enoent')) {
      return 'not_found';
    }
    if (message.includes('too large')) {
      return 'size_limit';
    }
    if (message.includes('parse') || message.includes('syntax')) {
      return 'parse_error';
    }
    
    return 'unknown';
  }
}
