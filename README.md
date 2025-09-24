# 🤖 DotSync

An intelligent dotfile management system that automatically discovers, understands, and synchronizes your Ubuntu configurations across machines using AI.

## What It Does

Never lose your perfect terminal setup again! This AI agent:

- **Discovers** your dotfiles and system configurations automatically
- **Understands** what each config does using Google Gemini AI
- **Organizes** everything in a structured GitHub repository
- **Installs** your complete setup on new machines with one command

## Features

### Smart Discovery
- Automatically finds `.bashrc`, `.vimrc`, `.gitconfig`, and more
- Detects installed packages and their versions
- Discovers custom scripts and aliases
- Identifies VS Code extensions and terminal themes

### AI Understanding
- Explains what each configuration does in plain English
- Identifies dependencies between configs and packages
- Categorizes settings by purpose (shell, editor, git, etc.)
- Generates helpful documentation automatically

### GitHub Integration
- Creates organized repository structure
- Commits with meaningful, AI-generated messages
- Maintains version history of your config evolution
- Stores dependency manifests and setup instructions

### One-Click Setup
- Interactive installation on new machines
- Smart conflict resolution with existing configs
- Automatic package installation and dependency handling
- Verification that everything works after setup

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **AI**: Vercel AI SDK with Google Gemini
- **Version Control**: GitHub (via Octokit.js)
- **CLI**: Commander.js
- **File Operations**: Node.js native modules

## Prerequisites

- Node.js 18+ and npm
- Ubuntu/Linux system
- GitHub account
- Google Gemini API key

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dotsync.git
cd dotsync

# Install dependencies with Yarn
yarn install

# Install Vercel AI SDK and Gemini provider
yarn add ai @ai-sdk/google

# Build the project
yarn build
```

### 2. Configuration

```bash
# Set up your API keys
cp .env.example .env

# Edit .env with your credentials
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_personal_access_token
```

### 3. Scan and Backup Your Dotfiles

```bash
# Discover and analyze your configurations
npm run scan

# Create GitHub repository and upload
npm run backup
```

### 4. Restore on New Machine

```bash
# Install your complete setup
npm run restore [repository-url]

# Or use interactive mode
npm run restore --interactive
```

## Project Structure

```
dotsync/
├── src/
│   ├── scanner/          # Dotfile discovery and reading
│   ├── parser/           # Configuration file parsers
│   ├── ai/              # Gemini AI integration
│   ├── github/          # GitHub repository management
│   ├── installer/       # Setup scripts for new machines
│   └── cli.ts           # Command-line interface
├── templates/           # Setup script templates
├── docs/               # Additional documentation
├── package.json
└── README.md
```

## Usage Examples

### Backup Current System
```bash
# Full system scan and backup
dotsync backup --all

# Backup specific configs only
dotsync backup --configs bash,vim,git

# Add AI explanations to configs
dotsync backup --explain
```

### Restore on New Machine
```bash
# Interactive restoration
dotsync restore https://github.com/yourusername/my-dotfiles

# Silent installation
dotsync restore --auto --repo my-dotfiles

# Preview what will be installed
dotsync restore --dry-run
```

### AI Features
```bash
# Get AI explanation of a config file
dotsync explain ~/.vimrc

# Get setup recommendations
dotsync recommend

# Generate documentation for your dotfiles
dotsync docs --generate
```

## Configuration

### Supported Dotfiles
- Shell: `.bashrc`, `.bash_profile`, `.zshrc`, `.zsh_profile`, Oh My Zsh configs
- Editors: `.vimrc`, `.nvimrc`, VS Code settings
- Git: `.gitconfig`, `.gitignore_global`
- SSH: SSH config and known hosts
- Package managers: APT, Snap, Flatpak lists

### Customization
```typescript
// config/scanner.config.ts
export const scanConfig = {
  includePaths: [
    '~/.bashrc',
    '~/.vimrc',
    '~/.gitconfig',
    // Add your custom paths
  ],
  excludePatterns: [
    '*.log',
    '*.cache',
    // Add patterns to ignore
  ],
  aiFeatures: {
    generateExplanations: true,
    detectDependencies: true,
    suggestImprovements: false
  }
};
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development

```bash
# Run in development mode
yarn dev

# Run tests
yarn test

# Lint and format
yarn lint
yarn format

# Build for production
yarn build
```

## Troubleshooting

### Common Issues

**Permission Errors**
```bash
# Make sure the CLI is executable
chmod +x dist/cli.js

# Or run with node directly
node dist/cli.js
```

**GitHub Authentication**
```bash
# Verify your token has the right permissions
# Scopes needed: repo, user:email
```

**AI API Limits**
- Free Gemini tier has rate limits
- Large configs may need chunking
- Check your API quota in Google Cloud Console

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Google Gemini for AI capabilities
- GitHub for hosting and API
- The open-source community for inspiration

## Links

- [Documentation](docs/)
- [Examples](examples/)
- [Issue Tracker](https://github.com/yourusername/dotfile-manager-ai/issues)
- [ALX AI for Developers Program](https://www.alxafrica.com/)

---

**Built as a capstone project for ALX AI for Developers Program** 