# Release Guide

This document outlines the release process for the create-bun-monorepo.

## Automated Release (Recommended)

Use the automated release script for consistent releases:

```bash
# Automatic release with changeset generation
bun run release:auto

# Manual release (if changeset already exists)
bun run release
```

## Manual Release Process

### Pre-release Steps

- [ ] Ensure all tests pass: `bun run test`
- [ ] Run comprehensive E2E tests: `bun run test:e2e`
- [ ] Verify templates work: `bun run test:templates`
- [ ] Test the CLI manually in a temporary directory
- [ ] Update version using changesets: `bun run changeset`
- [ ] Review generated changeset in `.changeset/` directory

### Testing Checklist

```bash
# Run full test suite (includes all test types)
bun run test

# Individual test categories
bun run test:main         # Main integration test
bun run test:templates    # Template validation tests
bun run test:e2e          # E2E Playwright tests

# Manual testing
cd /tmp
mkdir test-release && cd test-release
node /path/to/create-bun-monorepo/dist/index.js
```

### Publishing

```bash
# Build the project
bun run build

# Verify the built CLI works
node dist/index.js --help

# Version and publish (using changesets)
bun run changeset:version  # Updates package.json and CHANGELOG
bun run changeset:publish  # Publishes to NPM

# Or use the combined command
bun run release
```

### Post-release

- [ ] Verify the package is available on NPM: `npm view create-bun-monorepo`
- [ ] Test installation: `npm install -g create-bun-monorepo`
- [ ] Create Git tag: `git tag v$(bun run scripts/json-query.ts package.json .version)`
- [ ] Push tags: `git push --tags`
- [ ] Update documentation if needed
- [ ] Announce the release

## Testing Templates

### Frontend Templates (E2E Tested)
- **React Vite**: `bun run test:e2e` includes this
- **React Webpack**: `bun run test:e2e` includes this  
- **Next.js**: `bun run test:e2e` includes this

### All Templates (Unit Tested)
- **Express**, **Hono**: Backend frameworks
- **React Native (Expo/Bare)**: Mobile development
- **Next.js + Solito**: Universal apps
- **UI/Utils/Hooks/Schemas**: Package templates

## CI/CD Integration

The unified test script is designed for CI/CD:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: bun run test

# Or for faster CI (skip E2E)
- name: Run Core Tests  
  run: |
    bun run test:main
    bun run test:templates
```

## Troubleshooting

### Common Issues
- **E2E Tests Fail**: Ensure Playwright is installed: `npx playwright install`
- **Template Tests Fail**: Check templates in `./templates/` directory
- **Build Fails**: Verify TypeScript: `bun run typecheck`

### Test Cleanup
Tests create temporary projects with `test-` prefix and clean up automatically.
If manual cleanup needed: `rm -rf test-*`

- v1.0.0: Initial release with basic monorepo scaffolding
  - Biome/ESLint+Prettier/None linting options
  - Apps and packages structure
  - Bun workspace configuration
