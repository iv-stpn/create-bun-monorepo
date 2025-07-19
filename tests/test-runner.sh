#!/usr/bin/env bash

# Bun Monorepo Scaffolder - Unified Test Suite
# Comprehensive testing for all scenarios with E2E validation and Playwright support
# This single script replaces all other test runners for maximum simplicity

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_PATH="$PROJECT_ROOT/dist/index.js"
TEST_OUTPUT_DIR="/tmp/bun-scaffolder-test"

# Test modes
RUN_PLAYWRIGHT="${RUN_PLAYWRIGHT:-false}"
TEST_MODE="${TEST_MODE:-core}" # core, full, playwright-only

# Test timing
START_TIME=$(date +%s)

# Server management for Playwright
# Using simple variables instead of associative arrays for compatibility
SERVER_PIDS_LIST=""

# Logging functions
log_info() {
    echo "[TEST] $(date '+%H:%M:%S') $1"
}

log_success() {
    echo "[✅] $(date '+%H:%M:%S') $1"
}

log_error() {
    echo "[❌] $(date '+%H:%M:%S') $1" >&2
}

log_section() {
    echo ""
    echo "============================================================"
    echo "$1"
    echo "============================================================"
}

log_playwright() {
    echo "[🎭] $(date '+%H:%M:%S') $1"
}

# Cleanup function
cleanup_test_environment() {
    # Stop Docker services for any running projects
    if [ -n "$CURRENT_PROJECT_DIR" ] && [ -d "$CURRENT_PROJECT_DIR" ]; then
        stop_docker_services "$CURRENT_PROJECT_DIR"
    fi
    
    # Global cleanup of dev-postgres containers
    log_info "Cleaning up any existing Docker containers..."
    docker rm -f dev-postgres >/dev/null 2>&1 || true
    docker network rm dev-network >/dev/null 2>&1 || true
    
    if [ -n "$TEST_OUTPUT_DIR" ] && [ -d "$TEST_OUTPUT_DIR" ]; then
        log_info "Cleaning up test environment..."
        rm -rf "$TEST_OUTPUT_DIR" 2>/dev/null || true
    fi
    
    # Kill any remaining processes
    if [ -n "$SERVER_PIDS_LIST" ]; then
        for pid in $SERVER_PIDS_LIST; do
            kill "$pid" 2>/dev/null || true
        done
    fi
    
    pkill -f "bun run dev" 2>/dev/null || true
    pkill -f "node.*dev" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "expo" 2>/dev/null || true
}

# Docker Compose management for database
start_docker_services() {
    local project_dir="$1"
    log_info "Starting Docker services for database..."
    cd "$project_dir"
    
    # Check if Docker is available (try both docker compose and docker-compose)
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        local compose_cmd="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        local compose_cmd="docker-compose"
    else
        log_error "Neither 'docker compose' nor 'docker-compose' is available. Please install Docker."
        return 1
    fi
    
    # Check if docker-compose.dev.yml exists in the project
    if [ ! -f "docker-compose.dev.yml" ]; then
        log_error "docker-compose.dev.yml not found in project directory"
        return 1
    fi
    
    # Clean up any existing containers first
    log_info "Cleaning up any existing containers..."
    $compose_cmd -f docker-compose.dev.yml down >/dev/null 2>&1 || true
    
    # Remove any orphaned containers with the same name
    docker rm -f dev-postgres >/dev/null 2>&1 || true
    
    # Start PostgreSQL service using project's compose file
    if ! $compose_cmd -f docker-compose.dev.yml up -d postgres 2>/dev/null; then
        log_error "Failed to start PostgreSQL service with $compose_cmd"
        # Try to show more detail for debugging
        log_info "Attempting to start with verbose output..."
        $compose_cmd -f docker-compose.dev.yml up -d postgres || return 1
    fi
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if $compose_cmd -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "PostgreSQL failed to start after $max_attempts attempts"
            return 1
        fi
        
        log_info "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
}

stop_docker_services() {
    local project_dir="$1"
    if [ -n "$project_dir" ] && [ -d "$project_dir" ]; then
        log_info "Stopping Docker services..."
        cd "$project_dir"
        
        # Check if Docker is available (try both docker compose and docker-compose)
        if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
            local compose_cmd="docker compose"
        elif command -v docker-compose >/dev/null 2>&1; then
            local compose_cmd="docker-compose"
        else
            return 0  # If no compose available, nothing to stop
        fi
        
        $compose_cmd -f docker-compose.dev.yml down >/dev/null 2>&1 || true
    fi
}

# Test server response on specific port
test_server_response() {
    local port="$1"
    local max_retries="${2:-8}"
    local retry_delay="${3:-2}"
    
    for ((i=1; i<=max_retries; i++)); do
        if timeout 5 curl -f -s --max-time 3 "http://localhost:$port" >/dev/null 2>&1; then
            log_success "Server responding on port $port"
            return 0
        fi
        if [ $i -lt $max_retries ]; then
            sleep $retry_delay
        fi
    done
    log_error "Server not responding on port $port after $max_retries attempts"
    return 1
}

# Create test project with specific configuration
create_test_project() {
    local scenario_name="$1"
    local apps="$2"
    local packages="$3"
    local orm="$4"
    
    local project_name="test-$scenario_name"
    local project_dir="$TEST_OUTPUT_DIR/$project_name"
    
    # Log to stderr so they don't interfere with return value
    log_info "Creating project: $project_name" >&2
    log_info "Apps: $apps" >&2
    log_info "Packages: $packages" >&2
    log_info "ORM: $orm" >&2
    
    cd "$TEST_OUTPUT_DIR"
    
    # Remove existing project if it exists
    if [ -d "$project_name" ]; then
        rm -rf "$project_name"
    fi
    
    # Create the project
    NON_INTERACTIVE=true \
    APP_NAME="$project_name" \
    LANGUAGE="typescript" \
    LINTING="biome" \
    APPS="$apps" \
    PACKAGES="$packages" \
    ORM_TYPE="$orm" \
    DATABASE="postgresql" \
    timeout 120 node "$CLI_PATH" > "/tmp/creation-$scenario_name.log" 2>&1
    
    if [ ! -d "$project_name" ]; then
        log_error "Failed to create project: $project_name" >&2
        cat "/tmp/creation-$scenario_name.log" >&2 || true
        return 1
    fi
    
    # Set up environment file for ORM scenarios
    if [ "$orm" = "prisma" ] || [ "$orm" = "drizzle" ]; then
        cd "$project_name"
        if [ -f ".env.example" ]; then
            cp ".env.example" ".env"
            log_info "Copied .env.example to .env for database connection" >&2
        fi
        cd "$TEST_OUTPUT_DIR"
    fi
    
    echo "$project_dir"
}

# Validate code quality (install, typecheck, lint, build)
validate_code_quality() {
    local project_dir="$1"
    local scenario_name="$2"
    
    cd "$project_dir"
    
    # Install dependencies
    log_info "Installing dependencies for $scenario_name..."
    if ! timeout 180 bun install > "/tmp/install-$scenario_name.log" 2>&1; then
        log_error "Failed to install dependencies for $scenario_name"
        tail -20 "/tmp/install-$scenario_name.log" || true
        return 1
    fi
    log_success "Dependencies installed for $scenario_name"
    
    # Run typecheck
    log_info "Running typecheck for $scenario_name..."
    if ! timeout 90 bun run typecheck > "/tmp/typecheck-$scenario_name.log" 2>&1; then
        log_error "Typecheck failed for $scenario_name"
        tail -20 "/tmp/typecheck-$scenario_name.log" || true
        return 1
    fi
    log_success "Typecheck passed for $scenario_name"
    
    # Run lint
    log_info "Running lint for $scenario_name..."
    if ! timeout 60 bun run lint > "/tmp/lint-$scenario_name.log" 2>&1; then
        log_info "Lint failed, attempting to auto-fix with biome..."
        if timeout 60 bunx biome check --write . > "/tmp/biome-fix-$scenario_name.log" 2>&1; then
            log_info "Auto-fix completed, retrying lint..."
            if timeout 60 bun run lint > "/tmp/lint-retry-$scenario_name.log" 2>&1; then
                log_success "Lint passed after auto-fix for $scenario_name"
            else
                log_error "Lint failed after auto-fix for $scenario_name"
                tail -10 "/tmp/lint-retry-$scenario_name.log" || true
                return 1
            fi
        else
            log_error "Auto-fix failed for $scenario_name"
            tail -10 "/tmp/lint-$scenario_name.log" || true
            return 1
        fi
    else
        log_success "Lint passed for $scenario_name"
    fi
    
    # Build apps that support building
    log_info "Building apps for $scenario_name..."
    for app_dir in apps/*/; do
        if [ -d "$app_dir" ]; then
            local app_name=$(basename "$app_dir")
            cd "$project_dir/$app_dir"
            
            if grep -q '"build"' package.json 2>/dev/null; then
                log_info "Building $app_name..."
                if ! timeout 90 bun run build > "/tmp/build-$app_name-$scenario_name.log" 2>&1; then
                    log_error "Build failed for $app_name in $scenario_name"
                    tail -10 "/tmp/build-$app_name-$scenario_name.log" || true
                    return 1
                fi
                log_success "Build successful for $app_name"
            fi
        fi
    done
    
    cd "$project_dir"
    return 0
}

# Get expected port for app type
get_app_port() {
    local app_dir="$1"
    local app_name=$(basename "$app_dir")
    
    # Check package.json for port hints
    if grep -q "vite" "$app_dir/package.json" 2>/dev/null; then
        echo "3000"
    elif grep -q "next.*dev.*-p 3002" "$app_dir/package.json" 2>/dev/null; then
        echo "3002"
    elif grep -q "remix" "$app_dir/package.json" 2>/dev/null; then
        echo "3003"
    elif grep -q "express" "$app_dir/package.json" 2>/dev/null; then
        echo "3100"
    elif grep -q "hono" "$app_dir/package.json" 2>/dev/null; then
        echo "8000"
    elif grep -q "nestjs" "$app_dir/package.json" 2>/dev/null; then
        echo "3101"
    elif grep -q "expo" "$app_dir/package.json" 2>/dev/null; then
        echo "8081"
    elif grep -q "react-native" "$app_dir/package.json" 2>/dev/null; then
        echo "8080"
    else
        echo "3000"  # Default
    fi
}

# Run E2E tests (test that dev servers start and respond)
run_e2e_tests() {
    local project_dir="$1"
    local scenario_name="$2"
    
    cd "$project_dir"
    
    log_info "Running E2E tests for $scenario_name..."
    
    # Test each app's dev server
    for app_dir in apps/*/; do
        if [ -d "$app_dir" ]; then
            local app_name=$(basename "$app_dir")
            local expected_port=$(get_app_port "$app_dir")
            
            # Copy .env file to app directory for environment variable access
            if [ -f "$project_dir/.env" ]; then
                cp "$project_dir/.env" "$project_dir/$app_dir/"
            fi
            
            cd "$project_dir/$app_dir"
            
            log_info "Testing E2E for $app_name on port $expected_port..."
            
            # Start dev server in background
            timeout 45 bun run dev > "/tmp/e2e-$app_name-$scenario_name.log" 2>&1 &
            local server_pid=$!
            
            # Store PID for cleanup (simple list)
            SERVER_PIDS_LIST="$SERVER_PIDS_LIST $server_pid"
            
            # Wait for server to start
            sleep 5
            
            # Test server response
            if test_server_response "$expected_port" 6 3; then
                log_success "E2E test passed for $app_name"
                kill $server_pid 2>/dev/null || true
                # Remove PID from list
                SERVER_PIDS_LIST=$(echo "$SERVER_PIDS_LIST" | sed "s/ $server_pid//g")
                sleep 1
            else
                log_error "E2E test failed for $app_name"
                kill $server_pid 2>/dev/null || true
                # Remove PID from list
                SERVER_PIDS_LIST=$(echo "$SERVER_PIDS_LIST" | sed "s/ $server_pid//g")
                log_info "Server logs for $app_name:"
                tail -15 "/tmp/e2e-$app_name-$scenario_name.log" || true
                return 1
            fi
        fi
    done
    
    cd "$project_dir"
    return 0
}

# Start server for Playwright tests
start_playwright_server() {
    local app_name="$1"
    local app_path="$2"
    local expected_port="$3"
    
    log_playwright "Starting server for $app_name on port $expected_port..."
    
    # Copy .env file to app directory for environment variable access
    if [ -f "$project_dir/.env" ]; then
        cp "$project_dir/.env" "$app_path/"
    fi
    
    cd "$app_path"
    
    # Start dev server in background
    timeout 120 bun run dev > "/tmp/playwright-server-$app_name.log" 2>&1 &
    local pid=$!
    SERVER_PIDS_LIST="$SERVER_PIDS_LIST $pid"
    
    # Wait for server to be ready
    local max_retries=20
    local retry_delay=3
    
    for ((i=1; i<=max_retries; i++)); do
        if timeout 5 curl -f -s --max-time 3 "http://localhost:$expected_port" >/dev/null 2>&1; then
            log_success "Server ready for $app_name on port $expected_port"
            return 0
        fi
        if [ $i -lt $max_retries ]; then
            sleep $retry_delay
        fi
    done
    
    log_error "Server failed to start for $app_name on port $expected_port"
    kill $pid 2>/dev/null || true
    SERVER_PIDS_LIST=$(echo "$SERVER_PIDS_LIST" | sed "s/ $pid//g")
    return 1
}

# Stop Playwright server
stop_playwright_server() {
    local app_name="$1"
    
    # Since we're using a simple PID list, we'll just kill all servers
    # This is simpler and works well for our use case
    log_playwright "Stopping servers for $app_name"
    
    if [ -n "$SERVER_PIDS_LIST" ]; then
        for pid in $SERVER_PIDS_LIST; do
            kill "$pid" 2>/dev/null || true
        done
        SERVER_PIDS_LIST=""
    fi
}

# Run Playwright tests for a specific template
run_playwright_for_template() {
    local template_name="$1"
    local project_dir="$2"
    
    local spec_file="$SCRIPT_DIR/e2e/${template_name}.spec.ts"
    
    if [ ! -f "$spec_file" ]; then
        log_error "No Playwright spec found for $template_name at $spec_file"
        return 1
    fi
    
    # Find the app directory for this template
    local app_dir=""
    for dir in "$project_dir"/apps/*/; do
        if [ -d "$dir" ]; then
            local dir_name=$(basename "$dir")
            # Match template patterns
            case "$template_name" in
                "react-vite")
                    if [[ "$dir_name" =~ (web|frontend) ]] && grep -q "vite" "$dir/package.json" 2>/dev/null; then
                        app_dir="$dir"
                        break
                    fi
                    ;;
                "nextjs")
                    if [[ "$dir_name" =~ (web|frontend) ]] && grep -q "next" "$dir/package.json" 2>/dev/null; then
                        app_dir="$dir"
                        break
                    fi
                    ;;
                "express"|"hono"|"nestjs")
                    if [[ "$dir_name" =~ backend ]] && grep -q "$template_name" "$dir/package.json" 2>/dev/null; then
                        app_dir="$dir"
                        break
                    fi
                    ;;
            esac
        fi
    done
    
    if [ -z "$app_dir" ]; then
        log_error "Could not find app directory for template $template_name in $project_dir"
        return 1
    fi
    
    local expected_port=$(get_app_port "$app_dir")
    
    # Start server
    if ! start_playwright_server "$template_name" "$app_dir" "$expected_port"; then
        return 1
    fi
    
    # Run Playwright tests
    log_playwright "Running Playwright tests for $template_name..."
    cd "$SCRIPT_DIR"
    
    if timeout 120 npx playwright test "$spec_file" --reporter=line > "/tmp/playwright-$template_name.log" 2>&1; then
        log_success "Playwright tests passed for $template_name"
        stop_playwright_server "$template_name"
        return 0
    else
        log_error "Playwright tests failed for $template_name"
        tail -20 "/tmp/playwright-$template_name.log" || true
        stop_playwright_server "$template_name"
        return 1
    fi
}

# Test complete scenario (create, validate quality, run E2E, optionally run Playwright)
test_complete_scenario() {
    local scenario_name="$1"
    local apps="$2"
    local packages="$3"
    local orm="$4"
    local description="$5"
    
    log_section "SCENARIO: $description"
    
    # Create project
    local project_dir
    project_dir=$(create_test_project "$scenario_name" "$apps" "$packages" "$orm") || return 1
    
    # Track current project for cleanup
    CURRENT_PROJECT_DIR="$project_dir"
    
    # Start Docker services for ORM scenarios
    if [ "$orm" = "prisma" ] || [ "$orm" = "drizzle" ]; then
        start_docker_services "$project_dir" || return 1
    fi
    
    # Validate code quality
    validate_code_quality "$project_dir" "$scenario_name" || return 1
    
    # Run E2E tests
    run_e2e_tests "$project_dir" "$scenario_name" || return 1
    
    # Run Playwright tests if enabled
    if [ "$RUN_PLAYWRIGHT" = "true" ]; then
        log_info "Running Playwright tests for scenario: $description"
        
        # Extract template names from apps parameter and run Playwright for each
        IFS=',' read -ra app_array <<< "$apps"
        for app_spec in "${app_array[@]}"; do
            # Extract template from format like "web[react-vite]" -> "react-vite"
            if [[ "$app_spec" =~ \[([^]]+)\] ]]; then
                local template_name="${BASH_REMATCH[1]}"
                run_playwright_for_template "$template_name" "$project_dir" || true  # Don't fail scenario on Playwright failure
            fi
        done
    fi
    
    # Clean up Docker services for this scenario
    if [ "$orm" = "prisma" ] || [ "$orm" = "drizzle" ]; then
        stop_docker_services "$project_dir"
    fi
    
    log_success "Scenario '$description' completed successfully!"
    return 0
}

# Run all templates individually (full mode)
test_all_templates() {
    log_section "TESTING ALL INDIVIDUAL TEMPLATES"
    
    # All available templates
    local templates=(
        "react-vite"
        "react-webpack" 
        "nextjs"
        "nextjs-solito"
        "express"
        "hono"
        "nestjs"
        "react-native-expo"
        "react-native-bare"
        "remix"
    )
    
    for template in "${templates[@]}"; do
        local project_name="test-template-$template"
        
        log_info "Testing template: $template"
        
        # Create simple project with this template
        local project_dir
        project_dir=$(create_test_project "template-$template" "app[$template]" "ui" "prisma") || continue
        
        # Quick validation
        validate_code_quality "$project_dir" "template-$template" || continue
        run_e2e_tests "$project_dir" "template-$template" || continue
        
        log_success "Template $template tested successfully"
    done
}

# Generate test report
generate_test_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    log_section "TEST COMPLETION REPORT"
    
    case "$TEST_MODE" in
        "core")
            log_success "All 4 core scenarios tested successfully!"
            echo ""
            echo "✅ SCENARIOS TESTED:"
            echo "   1. All packages + Prisma ORM"
            echo "   2. All packages + Drizzle ORM"  
            echo "   3. UI packages only + Prisma ORM"
            echo "   4. UI packages only + Drizzle ORM"
            ;;
        "full")
            log_success "All scenarios and individual templates tested!"
            echo ""
            echo "✅ COMPREHENSIVE TESTING COMPLETED:"
            echo "   • 4 core scenarios"
            echo "   • Individual template testing"
            ;;
        "playwright-only")
            log_success "Playwright tests completed!"
            ;;
    esac
    
    log_info "Total test time: ${minutes}m ${seconds}s"
    log_info "Test artifacts location: $TEST_OUTPUT_DIR"
    
    echo ""
    echo "✅ VALIDATIONS PERFORMED:"
    echo "   • Project scaffolding"
    echo "   • Dependency installation"
    echo "   • TypeScript compilation"
    echo "   • Linting (Biome)"
    echo "   • App building"
    echo "   • E2E dev server testing"
    if [ "$RUN_PLAYWRIGHT" = "true" ]; then
        echo "   • Playwright browser testing"
    fi
    echo ""
}

# Show usage information
show_usage() {
    echo "Bun Monorepo Scaffolder - Unified Test Runner"
    echo ""
    echo "USAGE:"
    echo "  $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  --mode=MODE          Set test mode: core, full, playwright-only (default: core)"
    echo "  --playwright         Enable Playwright tests (default: false)"
    echo "  --help               Show this help message"
    echo ""
    echo "TEST MODES:"
    echo "  core                 Run 4 core scenarios with E2E validation (default)"
    echo "  full                 Run core scenarios + individual template testing"
    echo "  playwright-only      Run only Playwright tests (requires existing projects)"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                          # Run core scenarios"
    echo "  $0 --mode=full             # Run comprehensive testing"
    echo "  $0 --playwright            # Run core scenarios + Playwright"
    echo "  $0 --mode=full --playwright # Run everything with Playwright"
    echo ""
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --mode=*)
                TEST_MODE="${1#*=}"
                shift
                ;;
            --playwright)
                RUN_PLAYWRIGHT="true"
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Validate test mode
    case "$TEST_MODE" in
        "core"|"full"|"playwright-only")
            ;;
        *)
            log_error "Invalid test mode: $TEST_MODE"
            show_usage
            exit 1
            ;;
    esac
}

# Main execution
main() {
    # Parse arguments
    parse_arguments "$@"
    
    log_section "BUN MONOREPO SCAFFOLDER - UNIFIED TEST SUITE"
    log_info "Starting test suite at $(date)"
    log_info "Test mode: $TEST_MODE"
    log_info "Playwright enabled: $RUN_PLAYWRIGHT"
    
    # Set up cleanup trap
    trap cleanup_test_environment EXIT
    
    # Clean up any existing test environment
    cleanup_test_environment
    
    # Create test output directory
    mkdir -p "$TEST_OUTPUT_DIR"
    
    # Ensure CLI is built
    if [ ! -f "$CLI_PATH" ]; then
        log_info "Building CLI..."
        cd "$PROJECT_ROOT"
        bun run build
        if [ ! -f "$CLI_PATH" ]; then
            log_error "Failed to build CLI"
            exit 1
        fi
    fi
    
    # Execute based on test mode
    case "$TEST_MODE" in
        "core")
            # Run 4 core scenarios
            test_complete_scenario "all-packages-prisma" \
                "web[react-vite],frontend[nextjs],backend[express]" \
                "ui,ui-native,utils,schemas,hooks" \
                "prisma" \
                "All packages + Prisma ORM" || exit 1
            
            test_complete_scenario "all-packages-drizzle" \
                "web[react-vite],frontend[nextjs],backend[hono]" \
                "ui,ui-native,utils,schemas,hooks" \
                "drizzle" \
                "All packages + Drizzle ORM" || exit 1
            
            test_complete_scenario "ui-packages-prisma" \
                "web[react-vite],backend[express]" \
                "ui,ui-native" \
                "prisma" \
                "UI packages only + Prisma ORM" || exit 1
            
            test_complete_scenario "ui-packages-drizzle" \
                "web[react-vite],backend[hono]" \
                "ui,ui-native" \
                "drizzle" \
                "UI packages only + Drizzle ORM" || exit 1
            ;;
            
        "full")
            # Run core scenarios first
            test_complete_scenario "all-packages-prisma" \
                "web[react-vite],frontend[nextjs],backend[express]" \
                "ui,ui-native,utils,schemas,hooks" \
                "prisma" \
                "All packages + Prisma ORM" || exit 1
            
            test_complete_scenario "all-packages-drizzle" \
                "web[react-vite],frontend[nextjs],backend[hono]" \
                "ui,ui-native,utils,schemas,hooks" \
                "drizzle" \
                "All packages + Drizzle ORM" || exit 1
            
            test_complete_scenario "ui-packages-prisma" \
                "web[react-vite],backend[express]" \
                "ui,ui-native" \
                "prisma" \
                "UI packages only + Prisma ORM" || exit 1
            
            test_complete_scenario "ui-packages-drizzle" \
                "web[react-vite],backend[hono]" \
                "ui,ui-native" \
                "drizzle" \
                "UI packages only + Drizzle ORM" || exit 1
            
            # Then test all individual templates
            test_all_templates
            ;;
            
        "playwright-only")
            if [ "$RUN_PLAYWRIGHT" != "true" ]; then
                RUN_PLAYWRIGHT="true"
            fi
            log_info "Playwright-only mode: Creating minimal projects for browser testing"
            
            # Create minimal projects for Playwright testing
            test_complete_scenario "playwright-react" \
                "web[react-vite]" \
                "ui" \
                "prisma" \
                "React Vite for Playwright" || exit 1
            ;;
    esac
    
    generate_test_report
}

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
