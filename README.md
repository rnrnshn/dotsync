# 🤖 DotSync
<img width="1920" height="1077" alt="image" src="https://github.com/user-attachments/assets/ef9dafc2-42be-4e1f-aa9b-2c73ae396119" />

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

**Option A: Global Installation (Recommended)**
```bash
# Clone the repository
git clone https://github.com/yourusername/dotsync.git
cd dotsync

# Install dependencies
npm install

# Build the project
npm run build

# Install globally for easy access
npm install -g .
```

**Option B: Local Development**
```bash
# Clone the repository
git clone https://github.com/yourusername/dotsync.git
cd dotsync

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Configuration

```bash
# Set up your API keys
cp .env.example .env

# Edit .env with your credentials
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_personal_access_token
```

### 3. Usage

**With Global Installation:**
```bash
# Discover and analyze your configurations
dotsync scan

# Create GitHub repository and upload
dotsync backup

# Restore on new machine
dotsync restore https://github.com/username/dotfiles

# Get AI explanation of a config
dotsync explain ~/.bashrc

# Check system health
dotsync health
```

**With Local Installation:**
```bash
# Use npm scripts
npm run scan
npm run backup
npm run restore [repository-url]

# Or run directly
node dist/cli.js scan
node dist/cli.js backup
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

### Basic Commands
```bash
# Scan your system for dotfiles
dotsync scan

# Create AI-analyzed backup to GitHub
dotsync backup

# Restore from GitHub repository
dotsync restore https://github.com/username/dotfiles

# Get AI explanation of a config file
dotsync explain ~/.bashrc

# Check system health and dependencies
dotsync health

# Show system information
dotsync info
```

### Advanced Usage
```bash
# Scan specific paths
dotsync scan --paths ~/.bashrc ~/.vimrc

# Backup with custom repository name
dotsync backup --repo my-custom-dotfiles

# Restore with dry-run to preview
dotsync restore --dry-run https://github.com/username/dotfiles

# Interactive restore mode
dotsync restore --interactive https://github.com/username/dotfiles
```

### AI Features
```bash
# Get detailed AI explanation
dotsync explain ~/.vimrc --verbose

# Generate documentation for all configs
dotsync docs --generate

# Get setup recommendations
dotsync recommend
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
