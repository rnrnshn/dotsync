# DotSync Test Suite

This directory contains comprehensive tests for the DotSync project, covering all core functionality and integration scenarios.

## Test Structure

```
src/__tests__/
├── setup.ts                    # Test setup and utilities
├── cli.test.ts                 # CLI command tests
├── integration.test.ts          # End-to-end workflow tests
└── README.md                   # This file

src/scanner/__tests__/
└── dotfile-scanner.test.ts     # Scanner module tests

src/ai/__tests__/
└── analysis-manager.test.ts    # AI analysis tests

src/github/__tests__/
└── backup-manager.test.ts      # GitHub integration tests

src/installer/__tests__/
└── restore-manager.test.ts     # Restore functionality tests
```

## Test Categories

### Unit Tests
- **Scanner Tests**: File discovery, type detection, error handling
- **AI Tests**: Configuration analysis, setup script generation
- **GitHub Tests**: Repository management, backup operations
- **Restore Tests**: Installation, package management, file operations
- **CLI Tests**: Command execution, error handling, help output

### Integration Tests
- **Complete Workflows**: Scan → Backup → Restore
- **Error Recovery**: Partial failures, service unavailability
- **Interactive Modes**: Dry run, interactive restore
- **Performance**: Large configuration sets, timeout handling

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### CI/CD Tests
```bash
# Continuous integration
npm run test:ci
```

## Test Configuration

### Jest Configuration
- **Preset**: ts-jest for TypeScript support
- **Environment**: Node.js
- **Coverage**: 80% threshold for all metrics
- **Timeout**: 30 seconds per test
- **Workers**: 4 parallel processes

### Test Environment
- **NODE_ENV**: test
- **API Keys**: Mocked for testing
- **File System**: Temporary directories
- **Network**: Mocked external services

## Test Utilities

### Setup Functions
- `createTestConfig()`: Generate test configuration objects
- `createTestAnalysis()`: Generate AI analysis objects
- `createTestRepo()`: Generate repository objects
- `createTestSystemInfo()`: Generate system information

### Assertion Helpers
- `expectSuccessfulResult()`: Assert successful operation results
- `expectErrorResult()`: Assert error operation results
- `withTimeout()`: Add timeout to async operations

### File Utilities
- `createTestFile()`: Create test files
- `cleanupTestFile()`: Clean up test files
- `generateTestConfigs()`: Generate multiple test configs

## Mock Strategy

### External Services
- **GitHub API**: Mocked with Octokit
- **AI Services**: Mocked Gemini responses
- **File System**: Real file operations in temp directories
- **Child Process**: Mocked execSync calls

### Data Generation
- **Configurations**: Realistic dotfile content
- **AI Analysis**: Structured analysis responses
- **System Info**: Mock system information
- **Error Scenarios**: Various failure conditions

## Coverage Goals

- **Branches**: 80% coverage
- **Functions**: 80% coverage
- **Lines**: 80% coverage
- **Statements**: 80% coverage

## Test Data

### Sample Configurations
- Bash: `.bashrc`, `.bash_profile`, `.bash_aliases`
- Zsh: `.zshrc`, `.zsh_profile`
- Vim: `.vimrc`, `.nvimrc`
- Git: `.gitconfig`, `.gitignore_global`
- SSH: `config`, `known_hosts`
- System: `.profile`, `.inputrc`, `.tmux.conf`

### Error Scenarios
- **Permission Errors**: File access denied
- **Not Found**: Missing files/directories
- **Size Limits**: Large file handling
- **Parse Errors**: Invalid configuration content
- **Network Errors**: API failures
- **Service Errors**: AI/GitHub unavailability

## Performance Testing

### Large Datasets
- **100+ Configurations**: Batch processing
- **Complex Dependencies**: Package management
- **Long Content**: Large configuration files
- **Nested Directories**: Deep file structures

### Timeout Handling
- **AI Analysis**: Rate limiting and timeouts
- **GitHub Operations**: API rate limits
- **File Operations**: Large file processing
- **Network Operations**: Connection timeouts

## Best Practices

### Test Organization
- **One test file per module**
- **Descriptive test names**
- **Clear setup/teardown**
- **Isolated test cases**

### Mock Management
- **Reset mocks between tests**
- **Use realistic mock data**
- **Test both success and failure paths**
- **Verify mock interactions**

### Error Testing
- **Test all error conditions**
- **Verify error messages**
- **Test error recovery**
- **Test graceful degradation**

## Continuous Integration

### GitHub Actions
- **Node.js 18+**: Multiple versions
- **Ubuntu/Linux**: Primary platform
- **Test Matrix**: Different configurations
- **Coverage Reports**: Automated reporting

### Pre-commit Hooks
- **Linting**: ESLint checks
- **Formatting**: Prettier formatting
- **Type Checking**: TypeScript compilation
- **Test Execution**: Unit test validation

## Troubleshooting

### Common Issues
- **Timeout Errors**: Increase test timeout
- **Permission Errors**: Check file system access
- **Mock Failures**: Verify mock setup
- **Coverage Gaps**: Add missing test cases

### Debug Mode
```bash
# Run with debug output
DEBUG=* npm test

# Run specific test with verbose output
npm test -- --verbose dotfile-scanner.test.ts
```

## Contributing

### Adding New Tests
1. **Follow naming convention**: `*.test.ts`
2. **Use test utilities**: Leverage setup functions
3. **Mock external dependencies**: Don't make real API calls
4. **Test edge cases**: Include error scenarios
5. **Update coverage**: Ensure adequate coverage

### Test Maintenance
- **Keep tests up to date**: Update when code changes
- **Remove obsolete tests**: Clean up unused tests
- **Optimize performance**: Reduce test execution time
- **Document complex tests**: Add comments for clarity
