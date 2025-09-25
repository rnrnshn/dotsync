/**
 * Vim configuration parser
 */

import { ConfigParser, ParsedConfig, ValidationResult, ConfigSummary } from './config-parser';
import { DotfileConfig, Result } from '../types';

export class VimParser extends ConfigParser {
  constructor() {
    super('vim');
  }

  parse(config: DotfileConfig): Result<ParsedConfig, Error> {
    try {
      const content = config.content;
      const lines = content.split('\n');
      
      const settings: Record<string, any> = {};
      const keyMappings: Record<string, string> = {};
      const plugins: string[] = [];
      const comments: string[] = [];
      const functions: string[] = [];
      const autocmds: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;

        // Extract comments
        if (line.startsWith('"')) {
          comments.push(line.substring(1).trim());
          continue;
        }

        // Extract settings
        const setMatch = line.match(/^set\s+(\w+)(?:=([^"]+))?/);
        if (setMatch) {
          const [, option, value] = setMatch;
          settings[option] = value || true;
          continue;
        }

        // Extract key mappings
        const mapMatch = line.match(/^(?:nore)?map\s+([^"]+)\s+(.+)$/);
        if (mapMatch) {
          const [, key, command] = mapMatch;
          keyMappings[key] = command;
          continue;
        }

        // Extract plugins
        const pluginMatch = line.match(/^Plug\s+['"]([^'"]+)['"]/);
        if (pluginMatch) {
          plugins.push(pluginMatch[1]);
          continue;
        }

        // Extract functions
        const funcMatch = line.match(/^function\s+(\w+)/);
        if (funcMatch) {
          functions.push(funcMatch[1]);
          continue;
        }

        // Extract autocmds
        const autocmdMatch = line.match(/^autocmd\s+(.+)$/);
        if (autocmdMatch) {
          autocmds.push(autocmdMatch[1]);
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
          data: { settings, keyMappings, plugins, functions, autocmds, lineCount: lines.length },
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
        if (line.includes('map') && !line.includes('noremap') && line.includes('<leader>')) {
          warnings.push(`Line ${lineNum}: Consider using noremap for leader key mappings`);
        }

        if (line.includes('set') && line.includes('=') && !line.includes('"')) {
          suggestions.push(`Line ${lineNum}: Consider quoting string values in set commands`);
        }

        // Check for potential issues
        if (line.includes('Plug') && !line.includes('call plug#begin')) {
          warnings.push(`Line ${lineNum}: Plugin without plug#begin() - ensure vim-plug is installed`);
        }

        if (line.includes('colorscheme') && !line.includes('try')) {
          suggestions.push(`Line ${lineNum}: Consider wrapping colorscheme in try-catch`);
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

    // Check for vim-plug
    if (content.includes('plug#begin') || content.includes('Plug')) {
      dependencies.push('vim-plug');
    }

    // Check for other plugin managers
    if (content.includes('Vundle') || content.includes('Plugin')) {
      dependencies.push('Vundle.vim');
    }

    if (content.includes('dein') || content.includes('dein#begin')) {
      dependencies.push('dein.vim');
    }

    // Check for specific plugins that might need system packages
    for (const line of lines) {
      if (line.includes('fzf')) {
        dependencies.push('fzf');
      }
      
      if (line.includes('ripgrep') || line.includes('rg')) {
        dependencies.push('ripgrep');
      }
      
      if (line.includes('ctags')) {
        dependencies.push('ctags');
      }
      
      if (line.includes('clang') || line.includes('clangd')) {
        dependencies.push('clang');
      }
      
      if (line.includes('python') && line.includes('provider')) {
        dependencies.push('python3');
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  getSummary(content: string): ConfigSummary {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim());
    
    const settings = lines.filter(line => /^set\s+/.test(line.trim()));
    const mappings = lines.filter(line => /^(?:nore)?map\s+/.test(line.trim()));
    const plugins = lines.filter(line => /^Plug\s+/.test(line.trim()));
    const functions = lines.filter(line => /^function\s+/.test(line.trim()));

    const features: string[] = [];
    
    if (content.includes('set number')) features.push('Line numbers');
    if (content.includes('set syntax')) features.push('Syntax highlighting');
    if (content.includes('set tabstop')) features.push('Tab configuration');
    if (content.includes('set expandtab')) features.push('Spaces for tabs');
    if (content.includes('set autoindent')) features.push('Auto-indentation');
    if (content.includes('set hlsearch')) features.push('Search highlighting');
    if (content.includes('set incsearch')) features.push('Incremental search');
    if (content.includes('set ignorecase')) features.push('Case-insensitive search');
    if (content.includes('set smartcase')) features.push('Smart case search');
    if (content.includes('set wrap')) features.push('Line wrapping');
    if (content.includes('set ruler')) features.push('Status line');
    if (content.includes('set showcmd')) features.push('Command display');
    if (content.includes('set wildmenu')) features.push('Command completion');
    if (content.includes('set backspace')) features.push('Backspace behavior');
    if (content.includes('set mouse')) features.push('Mouse support');
    if (content.includes('colorscheme')) features.push('Color scheme');
    if (content.includes('Plug')) features.push('Plugin management');
    if (mappings.length > 0) features.push('Custom key mappings');
    if (functions.length > 0) features.push('Custom functions');

    return {
      description: this.generateDescription(content),
      lineCount: lines.length,
      functionCount: functions.length,
      variableCount: settings.length,
      isComplex: nonEmptyLines.length > 100 || plugins.length > 10,
      features,
    };
  }

  private generateDescription(content: string): string {
    if (content.includes('Plug') || content.includes('Plugin')) {
      return 'Vim configuration with plugin management';
    }
    
    if (content.includes('colorscheme')) {
      return 'Vim configuration with custom color scheme';
    }
    
    if (content.includes('function') || content.includes('autocmd')) {
      return 'Advanced Vim configuration with custom functions';
    }
    
    if (content.includes('set number') || content.includes('set syntax')) {
      return 'Basic Vim configuration for development';
    }
    
    return 'Vim editor configuration file';
  }
}
