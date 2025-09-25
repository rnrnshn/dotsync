/**
 * Simple parser implementation for basic functionality
 */

import { ConfigParser, ParsedConfig, ValidationResult, ConfigSummary } from './config-parser';
import { DotfileConfig, Result } from '../types';

export class SimpleParser extends ConfigParser {
  constructor(configType: string) {
    super(configType as any);
  }

  parse(config: DotfileConfig): Result<ParsedConfig, Error> {
    try {
      const content = config.content;
      const lines = content.split('\n');
      
      return {
        success: true,
        data: {
          data: { content, lines: lines.length },
          variables: {},
          imports: [],
          comments: lines.filter(line => line.trim().startsWith('#')).map(line => line.trim()),
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  validate(content: string): Result<ValidationResult, Error> {
    return {
      success: true,
      data: {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      },
    };
  }

  extractDependencies(_content: string): string[] {
    const dependencies: string[] = [];
    const lines = _content.split('\n');

    for (const line of lines) {
      // Look for common package installations
      if (line.includes('apt install') || line.includes('apt-get install')) {
        const match = line.match(/apt(?:-get)?\s+install\s+(.+)/);
        if (match) {
          const packages = match[1].split(/\s+/).filter(pkg => pkg && !pkg.startsWith('-'));
          dependencies.push(...packages);
        }
      }
    }

    return [...new Set(dependencies)];
  }

  getSummary(_content: string): ConfigSummary {
    const lines = _content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim());
    
    return {
      description: `${this.configType} configuration file`,
      lineCount: lines.length,
      functionCount: 0,
      variableCount: 0,
      isComplex: nonEmptyLines.length > 50,
      features: [`${this.configType} configuration`],
    };
  }
}
