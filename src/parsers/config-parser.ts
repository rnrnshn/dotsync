/**
 * Base configuration parser with common functionality
 */

import { DotfileConfig, ConfigType, Result } from '../types';

export abstract class ConfigParser {
  protected readonly configType: ConfigType;

  constructor(configType: ConfigType) {
    this.configType = configType;
  }

  /**
   * Parse a configuration file and extract useful information
   */
  abstract parse(config: DotfileConfig): Result<ParsedConfig, Error>;

  /**
   * Validate the configuration content
   */
  abstract validate(content: string): Result<ValidationResult, Error>;

  /**
   * Extract dependencies from the configuration
   */
  abstract extractDependencies(content: string): string[];

  /**
   * Get a summary of the configuration
   */
  abstract getSummary(content: string): ConfigSummary;
}

export interface ParsedConfig {
  /** Parsed configuration data */
  data: any;
  /** Extracted variables and settings */
  variables: Record<string, any>;
  /** Imported/included files */
  imports: string[];
  /** Comments and documentation */
  comments: string[];
  /** Validation results */
  validation: ValidationResult;
  /** Additional parsed data */
  [key: string]: any;
}

export interface ValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Suggestions for improvement */
  suggestions: string[];
}

export interface ConfigSummary {
  /** Brief description of the configuration */
  description: string;
  /** Number of lines */
  lineCount: number;
  /** Number of functions/commands defined */
  functionCount: number;
  /** Number of variables set */
  variableCount: number;
  /** Whether it's a complex configuration */
  isComplex: boolean;
  /** Key features or functionality */
  features: string[];
}
