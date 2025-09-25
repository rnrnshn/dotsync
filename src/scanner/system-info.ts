/**
 * System information gathering
 */

import { execSync } from 'child_process';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { SystemInfo, PackageInfo } from '../types';

export class SystemInfoGatherer {
  private readonly homeDir: string;

  constructor() {
    this.homeDir = homedir();
  }

  /**
   * Gather comprehensive system information
   */
  async gatherSystemInfo(): Promise<SystemInfo> {
    const [os, version, shell, packages, packageManagers] = await Promise.all([
      this.getOSInfo(),
      this.getOSVersion(),
      this.getShellInfo(),
      this.getInstalledPackages(),
      this.getAvailablePackageManagers(),
    ]);

    return {
      os,
      version,
      shell,
      homeDir: this.homeDir,
      packages,
      packageManagers,
    };
  }

  /**
   * Get operating system information
   */
  private async getOSInfo(): Promise<string> {
    try {
      const osRelease = await readFile('/etc/os-release', 'utf8');
      const lines = osRelease.split('\n');
      const nameLine = lines.find(line => line.startsWith('NAME='));
      
      if (nameLine) {
        return nameLine.split('=')[1].replace(/"/g, '');
      }
      
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get operating system version
   */
  private async getOSVersion(): Promise<string> {
    try {
      const osRelease = await readFile('/etc/os-release', 'utf8');
      const lines = osRelease.split('\n');
      const versionLine = lines.find(line => line.startsWith('VERSION='));
      
      if (versionLine) {
        return versionLine.split('=')[1].replace(/"/g, '');
      }
      
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get current shell information
   */
  private async getShellInfo(): Promise<string> {
    try {
      const shell = process.env.SHELL || '/bin/bash';
      return shell.split('/').pop() || 'bash';
    } catch {
      return 'bash';
    }
  }

  /**
   * Get installed packages
   */
  private async getInstalledPackages(): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = [];

    try {
      // Get APT packages
      const aptPackages = await this.getAptPackages();
      packages.push(...aptPackages);

      // Get Snap packages
      const snapPackages = await this.getSnapPackages();
      packages.push(...snapPackages);

      // Get Flatpak packages
      const flatpakPackages = await this.getFlatpakPackages();
      packages.push(...flatpakPackages);

      // Get Python packages
      const pipPackages = await this.getPipPackages();
      packages.push(...pipPackages);

      // Get Node.js packages
      const npmPackages = await this.getNpmPackages();
      packages.push(...npmPackages);
    } catch (error) {
      console.warn('Error gathering package information:', error);
    }

    return packages;
  }

  /**
   * Get APT packages
   */
  private async getAptPackages(): Promise<PackageInfo[]> {
    try {
      const output = execSync('dpkg -l | grep "^ii" | awk \'{print $2, $3}\'', {
        encoding: 'utf8',
        timeout: 10000,
      });

      return output
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [name, version] = line.split(' ');
          return {
            name,
            version: version || 'unknown',
            manager: 'apt' as const,
            isEssential: this.isEssentialPackage(name),
          };
        });
    } catch {
      return [];
    }
  }

  /**
   * Get Snap packages
   */
  private async getSnapPackages(): Promise<PackageInfo[]> {
    try {
      const output = execSync('snap list', { encoding: 'utf8', timeout: 10000 });
      
      return output
        .split('\n')
        .slice(1) // Skip header
        .filter(line => line.trim())
        .map(line => {
          const [name, version] = line.split(/\s+/);
          return {
            name,
            version: version || 'unknown',
            manager: 'snap' as const,
            isEssential: false,
          };
        });
    } catch {
      return [];
    }
  }

  /**
   * Get Flatpak packages
   */
  private async getFlatpakPackages(): Promise<PackageInfo[]> {
    try {
      const output = execSync('flatpak list --app', { encoding: 'utf8', timeout: 10000 });
      
      return output
        .split('\n')
        .slice(1) // Skip header
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          const name = parts[0];
          const version = parts[1] || 'unknown';
          return {
            name,
            version,
            manager: 'flatpak' as const,
            isEssential: false,
          };
        });
    } catch {
      return [];
    }
  }

  /**
   * Get Python packages
   */
  private async getPipPackages(): Promise<PackageInfo[]> {
    try {
      const output = execSync('pip list --format=json', { encoding: 'utf8', timeout: 10000 });
      const packages = JSON.parse(output);
      
      return packages.map((pkg: any) => ({
        name: pkg.name,
        version: pkg.version,
        manager: 'pip' as const,
        isEssential: false,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get Node.js packages
   */
  private async getNpmPackages(): Promise<PackageInfo[]> {
    try {
      const output = execSync('npm list -g --depth=0 --json', { encoding: 'utf8', timeout: 10000 });
      const data = JSON.parse(output);
      const packages: PackageInfo[] = [];

      for (const [name, info] of Object.entries(data.dependencies || {})) {
        const pkg = info as any;
        packages.push({
          name,
          version: pkg.version || 'unknown',
          manager: 'npm' as const,
          isEssential: false,
        });
      }

      return packages;
    } catch {
      return [];
    }
  }

  /**
   * Get available package managers
   */
  private async getAvailablePackageManagers(): Promise<string[]> {
    const managers: string[] = [];

    try {
      // Check for APT
      execSync('which apt', { stdio: 'ignore' });
      managers.push('apt');
    } catch {
      // APT not available
    }

    try {
      // Check for Snap
      execSync('which snap', { stdio: 'ignore' });
      managers.push('snap');
    } catch {
      // Snap not available
    }

    try {
      // Check for Flatpak
      execSync('which flatpak', { stdio: 'ignore' });
      managers.push('flatpak');
    } catch {
      // Flatpak not available
    }

    try {
      // Check for Pip
      execSync('which pip', { stdio: 'ignore' });
      managers.push('pip');
    } catch {
      // Pip not available
    }

    try {
      // Check for NPM
      execSync('which npm', { stdio: 'ignore' });
      managers.push('npm');
    } catch {
      // NPM not available
    }

    return managers;
  }

  /**
   * Check if a package is essential for the system
   */
  private isEssentialPackage(name: string): boolean {
    const essentialPackages = [
      'bash',
      'coreutils',
      'findutils',
      'grep',
      'sed',
      'awk',
      'gzip',
      'tar',
      'wget',
      'curl',
      'git',
      'vim',
      'nano',
      'less',
      'man',
      'sudo',
      'systemd',
      'dbus',
      'network-manager',
    ];

    return essentialPackages.some(essential => 
      name.includes(essential) || essential.includes(name)
    );
  }
}
