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

## Supported Templates

### Apps
- **React + Vite**: Modern React development with Vite
- **React + Vike**: Next.js alternative using Vike (previously vite-pluging-ssr)
- **React Webpack**: Traditional React setup with Webpack
- **Next.js**: Full-stack React framework
- **Next.js + Solito**: Universal React apps (web + mobile)
- **React Router v7 (previously Remix)**: CSR + SSR React framework with nested routing
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
2. **Linting**: Select Biome, ESLint + Prettier, or none
3. **Apps**: Enter app names (supports bracket notation for template selection)
4. **Packages**: Select shared packages for your monorepo
5. **ORM**: Optionally add Prisma or Drizzle ORM

**App Template Selection in Interactive Mode:**
When entering app names, you can use bracket notation to specify templates:
```bash
# Examples for app input:
myapp[nextjs], api[express], frontend, [hono]
```
- `myapp[nextjs]` - Creates 'myapp' using Next.js template
- `api[express]` - Creates 'api' using Express template
- `frontend` - Interactive template selection
- `[hono]` - Creates 'hono' using Hono template

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
- 🗃️ **Creates a dedicated `db` package** containing database client and schemas
- 🐳 Generates `docker-compose.dev.yml` for database development
- 🔧 Configures environment variables
- 📦 Installs necessary dependencies
- 🔗 Adds database scripts to package.json

> **Note**: The `db` package is automatically included when you select an ORM and is not shown in the package selection menu. All apps that need database access import from `@{your-project}/db`.

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

### Database & ORM Support

- **Automatic DB Package**: When ORM is enabled, automatically creates a `@{project}/db` package
- **Centralized Database Logic**: All ORM schemas, clients, and configurations are in the dedicated db package
- **Framework Integration**: Apps automatically import from the db package with proper TypeScript support
- **Prisma & Drizzle**: Full support for both ORMs with auto-generated schemas and client setup
- **Docker Development**: Includes `docker-compose.dev.yml` for local database development

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

## CI/CD and Release Process

The project uses **GitHub Actions** for automated testing and releases:

### Continuous Integration (CI)
- **Trigger**: Automatically runs on pushes/PRs to `main` branch affecting relevant paths
- **Paths watched**: `src/`, `templates/`, `scripts/`, `tests/`, config files
- **Process**: 
  1. Linting and TypeScript checks
  2. Project build validation  
  3. Comprehensive 12-scenario test suite
  4. Artifacts upload on failure (logs, Playwright reports)

### Automated Releases
- **Trigger**: Runs after successful CI on `main` branch
- **Process**:
  1. **Waits for CI**: Release only runs after all CI tests pass
  2. **Quality checks**: Additional TypeScript, linting, and build validation
  3. **Changesets**: Automatically versions and publishes using changesets
  4. **GitHub Releases**: Creates releases with automated changelog

### Creating a Release
1. **Create changeset** (describes your changes):
   ```bash
   bun run changeset
   ```
2. **Push to main**:
   ```bash
   git push origin main
   ```
3. **Automatic**: GitHub Actions handles CI → Release → NPM publish

For more details, see [RELEASE.md](RELEASE.md).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

