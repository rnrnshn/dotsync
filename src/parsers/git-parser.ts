/**
 * Git configuration parser
 */

import { ConfigParser, ParsedConfig, ValidationResult, ConfigSummary } from './config-parser';
import { DotfileConfig, Result } from '../types';

export class GitParser extends ConfigParser {
  constructor() {
    super('git');
  }

  parse(config: DotfileConfig): Result<ParsedConfig, Error> {
    try {
      const content = config.content;
      const lines = content.split('\n');
      
      const sections: Record<string, Record<string, any>> = {};
      const aliases: Record<string, string> = {};
      const remotes: Record<string, string> = {};
      const comments: string[] = [];
      let currentSection = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;

        // Extract comments
        if (line.startsWith('#')) {
          comments.push(line.substring(1).trim());
          continue;
        }

        // Extract section headers
        const sectionMatch = line.match(/^\[([^\]]+)\]$/);
        if (sectionMatch) {
          currentSection = sectionMatch[1];
          if (!sections[currentSection]) {
            sections[currentSection] = {};
          }
          continue;
        }

        // Extract key-value pairs
        const kvMatch = line.match(/^([^=]+)\s*=\s*(.+)$/);
        if (kvMatch && currentSection) {
          const [, key, value] = kvMatch;
          const parsedValue = this.parseValue(value);
          
          // Special handling for aliases
          if (currentSection === 'alias') {
            aliases[key] = parsedValue;
          }
          
          // Special handling for remotes
          if (currentSection.startsWith('remote')) {
            const remoteName = currentSection.split('"')[1];
            if (remoteName) {
              remotes[remoteName] = parsedValue;
            }
          }
          
          sections[currentSection][key] = parsedValue;
        }
      }

      const validation = this.validate(content);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      return {
        success: true,
        data: {
          data: { sections, aliases, remotes, lineCount: lines.length },
          variables: {},
          imports: [],
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
        if (line.includes('=') && !line.match(/^[^=]+\s*=\s*.+$/)) {
          errors.push(`Line ${lineNum}: Invalid key-value format`);
        }

        // Check for unclosed sections
        if (line.startsWith('[') && !line.endsWith(']')) {
          errors.push(`Line ${lineNum}: Unclosed section header`);
        }

        // Check for potential issues
        if (line.includes('user.name') && !line.includes('user.email')) {
          suggestions.push(`Line ${lineNum}: Consider setting user.email along with user.name`);
        }

        if (line.includes('core.editor') && line.includes('vim') && !line.includes('nano')) {
          suggestions.push(`Line ${lineNum}: Consider using nano for core.editor if vim is not available`);
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

    // Git is always required
    dependencies.push('git');

    // Check for specific tools mentioned in config
    for (const line of lines) {
      if (line.includes('core.editor')) {
        const editorMatch = line.match(/core\.editor\s*=\s*(.+)/);
        if (editorMatch) {
          const editor = editorMatch[1].trim();
          if (editor.includes('vim')) {
            dependencies.push('vim');
          } else if (editor.includes('nano')) {
            dependencies.push('nano');
          } else if (editor.includes('code')) {
            dependencies.push('code');
          }
        }
      }

      if (line.includes('diff.tool') || line.includes('merge.tool')) {
        dependencies.push('meld');
      }

      if (line.includes('credential.helper')) {
        const helperMatch = line.match(/credential\.helper\s*=\s*(.+)/);
        if (helperMatch) {
          const helper = helperMatch[1].trim();
          if (helper.includes('store')) {
            // Built-in, no additional dependency
          } else if (helper.includes('cache')) {
            // Built-in, no additional dependency
          } else if (helper.includes('manager')) {
            dependencies.push('git-credential-manager');
          }
        }
      }

      // Check for specific commands in aliases
      if (line.includes('alias') && line.includes('=')) {
        const aliasMatch = line.match(/alias\.(\w+)\s*=\s*(.+)/);
        if (aliasMatch) {
          const [, _aliasName, command] = aliasMatch;
          const commandDeps = this.getCommandDependencies(command);
          dependencies.push(...commandDeps);
        }
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  getSummary(content: string): ConfigSummary {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim());
    
    const _sections = lines.filter(line => /^\[/.test(line.trim()));
    const aliases = lines.filter(line => /^alias\./.test(line.trim()));
    const settings = lines.filter(line => /^[^#\[]/.test(line.trim()) && line.includes('='));

    const features: string[] = [];
    
    if (content.includes('user.name')) features.push('User identity');
    if (content.includes('user.email')) features.push('User email');
    if (content.includes('core.editor')) features.push('Default editor');
    if (content.includes('core.autocrlf')) features.push('Line ending handling');
    if (content.includes('core.ignorecase')) features.push('Case sensitivity');
    if (content.includes('init.defaultBranch')) features.push('Default branch');
    if (content.includes('pull.rebase')) features.push('Pull strategy');
    if (content.includes('push.default')) features.push('Push strategy');
    if (content.includes('branch.autosetupmerge')) features.push('Branch tracking');
    if (content.includes('color.')) features.push('Color output');
    if (content.includes('alias.') || aliases.length > 0) features.push('Command aliases');
    if (content.includes('remote.')) features.push('Remote repositories');
    if (content.includes('credential.')) features.push('Credential management');
    if (content.includes('diff.')) features.push('Diff configuration');
    if (content.includes('merge.')) features.push('Merge configuration');

    return {
      description: this.generateDescription(content),
      lineCount: lines.length,
      functionCount: aliases.length,
      variableCount: settings.length,
      isComplex: nonEmptyLines.length > 50 || aliases.length > 10,
      features,
    };
  }

  private parseValue(value: string): any {
    const trimmed = value.trim();
    
    // Handle boolean values
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    
    // Handle numbers
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    
    // Remove quotes
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    
    return trimmed;
  }

  private getCommandDependencies(command: string): string[] {
    const commandMap: Record<string, string> = {
      'tig': 'tig',
      'lazygit': 'lazygit',
      'gh': 'gh',
      'hub': 'hub',
      'git-flow': 'git-flow',
      'git-lfs': 'git-lfs',
    };

    const dependencies: string[] = [];
    
    for (const [cmd, packageName] of Object.entries(commandMap)) {
      if (command.includes(cmd)) {
        dependencies.push(packageName);
      }
    }
    
    return dependencies;
  }

  private generateDescription(content: string): string {
    if (content.includes('alias.') && content.includes('=')) {
      return 'Git configuration with custom aliases';
    }
    
    if (content.includes('remote.') && content.includes('url')) {
      return 'Git configuration with remote repositories';
    }
    
    if (content.includes('credential.') || content.includes('user.')) {
      return 'Git configuration with user and credential settings';
    }
    
    if (content.includes('color.') || content.includes('diff.')) {
      return 'Git configuration with display and diff settings';
    }
    
    return 'Git configuration file';
  }
}
