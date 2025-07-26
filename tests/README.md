
## Testing

The project includes a comprehensive, unified test suite that validates all core functionality with **12 comprehensive scenarios**:

**Single Unified Test Runner:**
```bash
# Comprehensive testing (default) - tests all 12 scenarios
bun run test              # Runs test-runner.sh with 12 scenarios

# Extended testing options  
bun run test:full         # Same as core - 12 comprehensive scenarios
bun run test:playwright   # 12 scenarios + Playwright browser tests

# Direct script usage with all options
./tests/test-runner.sh                    # 12 scenarios (same as bun run test)
./tests/test-runner.sh --mode=full        # Same as core
./tests/test-runner.sh --playwright       # 12 scenarios + Playwright
```

**What gets tested - 12 Comprehensive Scenarios:**

Each scenario creates **one monorepo with ALL app templates** and tests different configurations:

**Configuration Matrix (6 linting/ORM combinations × 2 package variants = 12 scenarios):**

1. **ESLint+Prettier + Prisma + All Packages** (ui, ui-native, utils, schemas, hooks + 2 blank)
2. **ESLint+Prettier + Prisma + No Packages**  
3. **ESLint+Prettier + Drizzle + All Packages**
4. **ESLint+Prettier + Drizzle + No Packages**
5. **ESLint+Prettier + No ORM + All Packages**
6. **ESLint+Prettier + No ORM + No Packages**
7. **Biome + Prisma + All Packages**
8. **Biome + Prisma + No Packages**
9. **Biome + Drizzle + All Packages** 
10. **Biome + Drizzle + No Packages**
11. **Biome + No ORM + All Packages**
12. **Biome + No ORM + No Packages**

**Validation Steps (Early Exit on Error):**
1. **Dependency Installation**: `bun install` 
2. **Code Linting**: ESLint+Prettier vs Biome validation
3. **TypeScript Compilation**: `bun run typecheck`
4. **ORM Testing**: Database reset, schema generation and migration (includes database cleanup for consistent state)
5. **Build Validation**: Key apps compile successfully

**Test execution takes ~10 minutes** and creates temporary projects that are automatically cleaned up.

### Database Testing and Reset

The test suite ensures database consistency by automatically resetting the database state:

**For Prisma:**
- Runs `prisma migrate reset --force` to drop and recreate the database
- Generates fresh Prisma client with `prisma generate`
- Applies migrations with `prisma migrate dev`
- Verifies database connectivity with `prisma db push`

**For Drizzle:**
- Attempts `drizzle-kit drop --yes` to clean existing tables
- Falls back to `drizzle-kit push --force` if drop is unavailable
- Generates migration files with `drizzle-kit generate`
- Applies migrations with `drizzle-kit migrate`
- Verifies database connectivity

This ensures each test scenario starts with a clean database state and prevents conflicts between test runs.