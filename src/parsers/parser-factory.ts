/**
 * Parser factory for creating appropriate parsers
 */

import { ConfigType } from '../types';
import { ConfigParser } from './config-parser';
import { BashParser } from './bash-parser';
import { VimParser } from './vim-parser';
import { GitParser } from './git-parser';
import { SimpleParser } from './simple-parser';

export class ParserFactory {
  private static parsers: Map<ConfigType, ConfigParser> = new Map();

  /**
   * Get a parser for the specified configuration type
   */
  static getParser(configType: ConfigType): ConfigParser {
    if (!this.parsers.has(configType)) {
      this.parsers.set(configType, this.createParser(configType));
    }
    
    return this.parsers.get(configType)!;
  }

  /**
   * Create a new parser instance for the specified type
   */
  private static createParser(configType: ConfigType): ConfigParser {
    switch (configType) {
      case 'bash':
      case 'zsh':
        return new BashParser();
      case 'vim':
        return new VimParser();
      case 'git':
        return new GitParser();
      case 'ssh':
        return new SimpleParser('ssh');
      case 'vscode':
        return new SimpleParser('vscode');
      case 'system':
        return new SimpleParser('system');
      case 'custom':
        return new SimpleParser('custom');
      default:
        return new SimpleParser('custom');
    }
  }

  /**
   * Get all available parser types
   */
  static getAvailableParsers(): ConfigType[] {
    return ['bash', 'zsh', 'vim', 'git', 'ssh', 'vscode', 'system', 'custom'];
  }
}

