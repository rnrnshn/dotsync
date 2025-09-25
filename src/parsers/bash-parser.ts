/**
 * Bash configuration parser
 */

import { ConfigParser, ParsedConfig, ValidationResult, ConfigSummary } from './config-parser';
import { DotfileConfig, Result } from '../types';

export class BashParser extends ConfigParser {
  constructor() {
    super('bash');
  }

  parse(config: DotfileConfig): Result<ParsedConfig, Error> {
    try {
      const content = config.content;
      const lines = content.split('\n');
      
      const variables: Record<string, any> = {};
      const imports: string[] = [];
      const comments: string[] = [];
      const functions: string[] = [];
        const _aliases: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;

        // Extract comments
        if (line.startsWith('#')) {
          comments.push(line.substring(1).trim());
          continue;
        }

        // Extract variables
        const varMatch = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
        if (varMatch) {
          const [, name, value] = varMatch;
          variables[name] = this.parseValue(value);
          continue;
        }

        // Extract imports/source
        const importMatch = line.match(/^(source|\.)\s+(.+)$/);
        if (importMatch) {
          imports.push(importMatch[2].replace(/['"]/g, ''));
          continue;
        }

        // Extract function definitions
        const funcMatch = line.match(/^(\w+)\s*\(\s*\)\s*\{/);
        if (funcMatch) {
          functions.push(funcMatch[1]);
          continue;
        }

        // Extract aliases
        const aliasMatch = line.match(/^alias\s+(\w+)=(.+)$/);
        if (aliasMatch) {
          _aliases.push(aliasMatch[1]);
          continue;
        }
      }

      const validation = this.validate(content);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      return {
        success: true,
        data: {
          data: { variables, imports, comments, functions, aliases: _aliases, lineCount: lines.length },
          variables,
          imports,
          comments,
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
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Check for common syntax errors
        if (line.includes('$((') && !line.includes('))')) {
          errors.push(`Line ${lineNum}: Unclosed arithmetic expansion`);
        }

        if (line.includes('${') && !line.includes('}')) {
          errors.push(`Line ${lineNum}: Unclosed variable expansion`);
        }

        if (line.includes('`') && (line.split('`').length - 1) % 2 !== 0) {
          errors.push(`Line ${lineNum}: Unclosed command substitution`);
        }

        // Check for potential issues
        if (line.includes('rm -rf') && !line.includes('$HOME')) {
          warnings.push(`Line ${lineNum}: Dangerous rm -rf command without path validation`);
        }

        if (line.includes('sudo') && !line.includes('echo')) {
          warnings.push(`Line ${lineNum}: Sudo command may require password input`);
        }

        // Check for best practices
        if (line.includes('export') && line.includes('=') && !line.includes('"')) {
          suggestions.push(`Line ${lineNum}: Consider quoting variable values`);
        }

        if (line.includes('cd') && !line.includes('||')) {
          suggestions.push(`Line ${lineNum}: Consider error handling for cd command`);
        }
      }

      return {
        success: true,
        data: {
          isValid: errors.length === 0,
          errors,
          warnings,
          suggestions,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Look for package installations
      if (line.includes('apt install') || line.includes('apt-get install')) {
        const match = line.match(/apt(?:-get)?\s+install\s+(.+)/);
        if (match) {
          const packages = match[1].split(/\s+/).filter(pkg => pkg && !pkg.startsWith('-'));
          dependencies.push(...packages);
        }
      }

      // Look for snap installations
      if (line.includes('snap install')) {
        const match = line.match(/snap\s+install\s+(.+)/);
        if (match) {
          const packages = match[1].split(/\s+/).filter(pkg => pkg && !pkg.startsWith('-'));
          dependencies.push(...packages);
        }
      }

      // Look for pip installations
      if (line.includes('pip install')) {
        const match = line.match(/pip\s+install\s+(.+)/);
        if (match) {
          const packages = match[1].split(/\s+/).filter(pkg => pkg && !pkg.startsWith('-'));
          dependencies.push(...packages);
        }
      }

      // Look for npm installations
      if (line.includes('npm install')) {
        const match = line.match(/npm\s+install\s+(.+)/);
        if (match) {
          const packages = match[1].split(/\s+/).filter(pkg => pkg && !pkg.startsWith('-'));
          dependencies.push(...packages);
        }
      }

      // Look for common commands that might require packages
      const commandDeps = this.getCommandDependencies(line);
      dependencies.push(...commandDeps);
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  getSummary(content: string): ConfigSummary {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim());
    
    const functions = lines.filter(line => /^\w+\s*\(\s*\)\s*\{/.test(line.trim()));
    const variables = lines.filter(line => /^[A-Z_][A-Z0-9_]*\s*=/.test(line.trim()));
    const aliases = lines.filter(line => /^alias\s+\w+=/.test(line.trim()));

    const features: string[] = [];
    
    if (content.includes('export')) features.push('Environment variables');
    if (content.includes('alias') || aliases.length > 0) features.push('Command aliases');
    if (content.includes('function') || functions.length > 0) features.push('Custom functions');
    if (content.includes('source') || content.includes('.')) features.push('File imports');
    if (content.includes('PATH')) features.push('PATH modifications');
    if (content.includes('PS1')) features.push('Prompt customization');
    if (content.includes('history')) features.push('History configuration');

    return {
      description: this.generateDescription(content),
      lineCount: lines.length,
      functionCount: functions.length,
      variableCount: variables.length,
      isComplex: nonEmptyLines.length > 50 || functions.length > 5,
      features,
    };
  }

  private parseValue(value: string): any {
    // Remove quotes and handle special cases
    const trimmed = value.trim();
    
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1);
    }
    
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1);
    }
    
    if (trimmed === 'true' || trimmed === 'false') {
      return trimmed === 'true';
    }
    
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    
    return trimmed;
  }

  private getCommandDependencies(line: string): string[] {
    const commandMap: Record<string, string> = {
      'git': 'git',
      'docker': 'docker.io',
      'node': 'nodejs',
      'npm': 'npm',
      'python': 'python3',
      'pip': 'python3-pip',
      'curl': 'curl',
      'wget': 'wget',
      'vim': 'vim',
      'nano': 'nano',
      'htop': 'htop',
      'tree': 'tree',
      'jq': 'jq',
      'yq': 'yq',
      'kubectl': 'kubectl',
      'terraform': 'terraform',
      'aws': 'awscli',
    };

    const dependencies: string[] = [];
    
    for (const [command, packageName] of Object.entries(commandMap)) {
      if (line.includes(command) && !line.includes('which') && !line.includes('command -v')) {
        dependencies.push(packageName);
      }
    }
    
    return dependencies;
  }

  private generateDescription(content: string): string {
    if (content.includes('PS1') || content.includes('prompt')) {
      return 'Shell prompt and display configuration';
    }
    
    if (content.includes('PATH') || content.includes('export PATH')) {
      return 'Environment and PATH configuration';
    }
    
    if (content.includes('alias')) {
      return 'Command aliases and shortcuts';
    }
    
    if (content.includes('function')) {
      return 'Custom shell functions and utilities';
    }
    
    if (content.includes('history')) {
      return 'Command history configuration';
    }
    
    return 'Bash shell configuration file';
  }
}
