# create-bun-monorepo

A CLI tool to quickly scaffold Bun monorepos with apps and packages, or add packages and apps to existing Bun monorepos.

## Features

- 🚀 **Fast**: Built with Bun for maximum performance
- 📦 **Monorepo Structure**: Automatically sets up workspace configuration
- 🔷 **TypeScript First**: All projects are TypeScript-based for better type safety
- 🧹 **Linting Options**: Biome, ESLint+Prettier, or none
- 🔗 **Package Dependencies**: Automatically links packages to apps
- ⚡ **Bun Workspaces**: Leverages Bun's workspace features
- 🗄️ **Database ORM**: Prisma and Drizzle support with PostgreSQL, MySQL, and SQLite
- 🐳 **Docker Compose**: Automatic dev environment setup for databases
- 🧪 **Robust Testing**: Comprehensive E2E tests for all frontend templates

## Supported Templates

### Apps
- **React Vite**: Modern React development with Vite
- **React Webpack**: Traditional React setup with Webpack
- **Next.js**: Full-stack React framework
- **Next.js + Solito**: Universal React apps (web + mobile)
- **Remix**: Full-stack React framework with nested routing
- **React Native (Expo)**: Mobile development with Expo
- **React Native (Bare)**: Bare React Native setup
- **Express**: Node.js backend with Express
- **Hono**: Modern web framework for the edge
- **NestJS**: Enterprise Node.js framework with TypeScript

### Packages
- **UI Components**: Shared React components
- **UI Native**: React Native components
- **Utils**: Utility functions and helpers
- **Hooks**: Custom React hooks
- **Schemas**: Type definitions and validation

## Installation

```bash
npm install -g create-bun-monorepo
```

## Usage

### Create a New Monorepo

```bash
create-bun-monorepo
```

The CLI will guide you through the setup process:

1. **App Name**: Enter the name of your monorepo
2. **Linting**: Select Biome, ESLint+Prettier, or none
3. **Apps**: Choose from various frontend and backend templates
4. **Packages**: Select shared packages for your monorepo
5. **ORM**: Optionally add Prisma or Drizzle ORM

### Add to Existing Monorepo

```bash
# Add packages and apps interactively
create-bun-monorepo add

# Add specific packages with template selection
create-bun-monorepo add --package hooks
create-bun-monorepo add --package "myutils[utils]"    # Custom name with template
create-bun-monorepo add --package "[schemas]"         # Use template name

# Add specific apps with template selection  
create-bun-monorepo add --app "myapi[express]"        # Custom name with template
create-bun-monorepo add --app "[nextjs]"              # Use template name

# Add ORM setup to existing monorepo
create-bun-monorepo add --orm
```

**Template Selection Syntax:**
- `name[template]` - Create with custom name using specific template
- `[template]` - Create using template name as the component name
- `name` - Interactive template selection or blank component

## Generated Structure

```
my-app/
├── package.json          # Root package.json with workspace config
├── tsconfig.json         # TypeScript configuration
├── tsconfig.base.json    # Base TypeScript configuration
├── biome.json            # Biome config (if Biome selected)
├── .eslintrc.json        # ESLint config (if ESLint selected)
├── .prettierrc           # Prettier config (if Prettier selected)
├── .gitignore            # Git ignore file
├── .env.example          # Environment variables example
├── docker-compose.dev.yml # Development database setup (if ORM enabled)
├── prisma/               # Prisma schema and migrations (if Prisma selected)
├── src/                  # Shared source files
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── index.ts
│   └── mobile/
│       ├── package.json
│       ├── tsconfig.json
│       └── index.ts
└── packages/
    ├── ui/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── index.ts
    └── utils/
        ├── package.json
        ├── tsconfig.json
        └── index.ts
```

## Database Setup

When you choose to add an ORM (Prisma or Drizzle), the scaffolder automatically:

- 📋 Sets up the ORM configuration and schema
- 🐳 Generates `docker-compose.dev.yml` for database development
- 🔧 Configures environment variables
- 📦 Installs necessary dependencies
- 🔗 Adds database scripts to package.json

### Supported Databases

- **PostgreSQL**: Includes pgAdmin for database management
- **MySQL**: Includes phpMyAdmin for database management  
- **SQLite**: Includes optional SQLite browser

### Quick Database Start

```bash
# Start your development database
docker-compose -f docker-compose.dev.yml up -d

# Run database migrations
bun run db:migrate

# Open database management interface
# PostgreSQL: http://localhost:5050 (pgAdmin)
# MySQL: http://localhost:8080 (phpMyAdmin)
# SQLite: docker-compose -f docker-compose.dev.yml --profile browser up
```

See [Docker Compose Documentation](./docs/DOCKER_COMPOSE.md) for detailed usage.

## Getting Started

After scaffolding your project:

```bash
cd my-awesome-app
bun install
bun run format    # Format all generated files
bun run lint      # Check for any linting issues
bun run dev       # Start development
```

## Features

### Workspace Configuration

- Automatically configures Bun workspaces
- Sets up package linking between apps and packages
- Includes build and dev scripts for the entire monorepo

### TypeScript Support

- Full TypeScript configuration with proper module resolution
- Project references for better IDE support
- Bun-specific TypeScript settings
- All apps and packages are TypeScript-based by default

### Linting Options

- **Biome**: Fast, all-in-one linter and formatter
- **ESLint + Prettier**: Traditional setup with ESLint and Prettier
- **None**: Skip linting setup entirely

### Package Dependencies

- Automatically adds workspace dependencies from packages to apps
- Uses workspace protocol for proper linking
- All projects use TypeScript for consistency and type safety

## Development

```bash
# Clone the repository
git clone <repository-url>
cd create-bun-monorepo

# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Run complete test suite (recommended before commits)
bun run test              # Tests all scenarios with E2E and code quality checks

# Linting and formatting
bun run lint              # Check for issues
bun run lint:fix          # Fix issues automatically
bun run format            # Format code
```

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

**Each scenario includes ALL 10 app templates:**
- React Vite • React Native Expo • Express API • Next.js Admin
- Remix CMS • Hono Gateway • NestJS Service • React Webpack Desktop  
- React Native Bare • Next.js + Solito Fullstack

**Validation Steps (Early Exit on Error):**
1. **Dependency Installation**: `bun install` 
2. **Code Linting**: ESLint+Prettier vs Biome validation
3. **TypeScript Compilation**: `bun run typecheck`
4. **ORM Testing**: Schema generation and migration (Prisma tests on all scenarios)
5. **Build Validation**: Key apps compile successfully

**Test execution takes ~10-15 minutes** and creates temporary projects that are automatically cleaned up.

### Before Committing
Simply run `bun run test` to validate that your changes work correctly across all scenarios.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.
