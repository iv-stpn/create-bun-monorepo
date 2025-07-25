# Release Guide

This document outlines the release process for the create-bun-monorepo.

## Automated Release (Recommended)

Releases are automated via GitHub Actions when changes are pushed to the `main` branch. The workflow automatically:

1. **Runs CI Tests**: Full test suite with 12 comprehensive scenarios
2. **Validates Quality**: TypeScript, linting, and building checks
3. **Automatic Versioning**: Updates package.json and CHANGELOG.md based on changesets  
4. **Publishes Release**: Publishes to NPM with updated version
5. **Creates GitHub Release**: Automatically generates release notes

### Creating a Release

1. **Create a changeset** (describes your changes):
   ```bash
   bun run changeset
   ```

2. **Push to main branch**:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin main
   ```

3. **GitHub Actions handles the rest**: The release workflow will automatically run after CI passes.

### Manual Release (Advanced)

For local development or emergency releases:

```bash
# Manual release (if changeset already exists)
bun run release

# Legacy automated release (deprecated - use GitHub Actions instead)
# bun run release:auto
```

## Manual Release Process

### Pre-release Steps
- [ ] Ensure all tests pass: `bun run test:full`
- [ ] Update version using changesets: `bun run changeset`
- [ ] Review generated changeset in `.changeset/` directory

### Testing Checklist
```bash
# Run full test suite (includes all test types)
bun run test

# Individual test categories
bun run test:full

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
