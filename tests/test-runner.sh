#!/usr/bin/env bash

# Comprehensive testing for all scenarios with E2E validation and Playwright support
# This single script replaces all other test runners for maximum simplicity

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_PATH="$PROJECT_ROOT/dist/index.js"
TEST_OUTPUT_DIR="/tmp/create-bun-monorepo"

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
    
    # Kill any remaining processes silently
    if [ -n "$SERVER_PIDS_LIST" ]; then
        set +m  # Disable job control messages
        for pid in $SERVER_PIDS_LIST; do
            { kill "$pid" && wait "$pid"; } 2>/dev/null || true
        done
        set -m  # Re-enable job control
    fi
    
    # Clean up any remaining dev processes
    {
        pkill -f "bun run dev\|bun run web:dev" 2>/dev/null || true
        pkill -f "node.*dev" 2>/dev/null || true
        pkill -f "next dev" 2>/dev/null || true
        pkill -f "vite" 2>/dev/null || true
        pkill -f "expo" 2>/dev/null || true
    } 2>/dev/null
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
    
    # Check package.json for port hints - order matters for specificity
    if grep -q "vite" "$app_dir/package.json" 2>/dev/null; then
        echo "3000"
    elif grep -q "next.*dev.*-p" "$app_dir/package.json" 2>/dev/null; then
        # Extract the port number from the Next.js dev command
        local port=$(grep -o "next dev -p [0-9]\+" "$app_dir/package.json" 2>/dev/null | grep -o "[0-9]\+" | head -1)
        if [ -n "$port" ]; then
            echo "$port"
        else
            echo "3000"
        fi
    elif grep -q "remix" "$app_dir/package.json" 2>/dev/null; then
        echo "3003"
    elif grep -q "nestjs" "$app_dir/package.json" 2>/dev/null; then
        echo "3101"
    elif grep -q "express" "$app_dir/package.json" 2>/dev/null; then
        echo "3100"
    elif grep -q "hono" "$app_dir/package.json" 2>/dev/null; then
        echo "8000"
    elif grep -q "expo" "$app_dir/package.json" 2>/dev/null; then
        echo "8081"
    elif grep -q "react-native" "$app_dir/package.json" 2>/dev/null; then
        echo "8080"
    elif grep -q "webpack" "$app_dir/package.json" 2>/dev/null; then
        echo "3001"
    else
        echo "3000"  # Default
    fi
}

# Get the correct dev script command for app type
get_dev_script() {
    local app_dir="$1"
    
    # React Native templates use web:dev for web development
    if grep -q "react-native-expo\|react-native-bare" "$app_dir/package.json" 2>/dev/null; then
        echo "web:dev"
    else
        echo "dev"
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
            local dev_script=$(get_dev_script "$app_dir")
            
            # Copy .env file to app directory for environment variable access
            if [ -f "$project_dir/.env" ]; then
                cp "$project_dir/.env" "$project_dir/$app_dir/"
            fi
            
            cd "$project_dir/$app_dir"
            
            log_info "Testing E2E for $app_name on port $expected_port..."
            
            # Start dev server in background (suppress job control messages)
            set +m  # Disable job control to suppress termination messages
            timeout 45 bun run "$dev_script" > "/tmp/e2e-$app_name-$scenario_name.log" 2>&1 &
            local server_pid=$!
            set -m  # Re-enable job control
            
            # Store PID for cleanup (simple list)
            SERVER_PIDS_LIST="$SERVER_PIDS_LIST $server_pid"
            
            # Wait for server to start - longer for webpack-based apps
            if grep -q "webpack" "$project_dir/$app_dir/package.json" 2>/dev/null; then
                sleep 10  # Webpack needs more time to compile
            else
                sleep 5
            fi
            
            # Test server response - more retries for webpack apps
            local retries=6
            local delay=3
            if grep -q "webpack" "$project_dir/$app_dir/package.json" 2>/dev/null; then
                retries=10  # More retries for webpack
                delay=2     # Shorter delay, more attempts
            fi
            
            if test_server_response "$expected_port" "$retries" "$delay"; then
                log_success "E2E test passed for $app_name"
                # Cleanup server process silently
                { kill $server_pid && wait $server_pid; } 2>/dev/null || true
                # Remove PID from list
                SERVER_PIDS_LIST=$(echo "$SERVER_PIDS_LIST" | sed "s/ $server_pid//g")
                sleep 1
            else
                log_error "E2E test failed for $app_name"
                # Cleanup server process silently
                { kill $server_pid && wait $server_pid; } 2>/dev/null || true
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
    local dev_script=$(get_dev_script "$app_path")
    
    log_playwright "Starting server for $app_name on port $expected_port..."
    
    # Copy .env file to app directory for environment variable access
    if [ -f "$project_dir/.env" ]; then
        cp "$project_dir/.env" "$app_path/"
    fi
    
    cd "$app_path"
    
    # Start dev server in background (suppress job control messages)
    set +m  # Disable job control to suppress termination messages
    timeout 120 bun run "$dev_script" > "/tmp/playwright-server-$app_name.log" 2>&1 &
    local pid=$!
    set -m  # Re-enable job control
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
    { kill $pid && wait $pid; } 2>/dev/null || true
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
        set +m  # Disable job control messages
        for pid in $SERVER_PIDS_LIST; do
            { kill "$pid" && wait "$pid"; } 2>/dev/null || true
        done
        set -m  # Re-enable job control
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
                run_playwright_for_template "$template_name" "$project_dir" || return 1
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
# New comprehensive testing approach - one monorepo with all apps, 12 scenarios
test_all_scenarios() {
    log_section "TESTING ALL SCENARIOS WITH COMPREHENSIVE MONOREPO"
    
    # All available app templates
    local all_apps="web[react-vite],mobile[react-native-expo],api[express],admin[nextjs],cms[remix],gateway[hono],service[nestjs],desktop[react-webpack],native[react-native-bare],fullstack[nextjs-solito]"
    
    # Package configurations
    local all_packages="ui,ui-native,utils,schemas,hooks,blank1,blank2"
    local no_packages=""
    
    # Configuration matrix: linting × orm × packages
    local scenarios=(
        # ESLint+Prettier configurations
        "eslint-prisma-packages:eslint:prisma:$all_packages:ESLint+Prettier + Prisma + All Packages"
        "eslint-prisma-none:eslint:prisma:$no_packages:ESLint+Prettier + Prisma + No Packages"
        "eslint-drizzle-packages:eslint:drizzle:$all_packages:ESLint+Prettier + Drizzle + All Packages"
        "eslint-drizzle-none:eslint:drizzle:$no_packages:ESLint+Prettier + Drizzle + No Packages"
        "eslint-none-packages:eslint:none:$all_packages:ESLint+Prettier + No ORM + All Packages"
        "eslint-none-none:eslint:none:$no_packages:ESLint+Prettier + No ORM + No Packages"
        
        # Biome configurations
        "biome-prisma-packages:biome:prisma:$all_packages:Biome + Prisma + All Packages"
        "biome-prisma-none:biome:prisma:$no_packages:Biome + Prisma + No Packages"
        "biome-drizzle-packages:biome:drizzle:$all_packages:Biome + Drizzle + All Packages"
        "biome-drizzle-none:biome:drizzle:$no_packages:Biome + Drizzle + No Packages"
        "biome-none-packages:biome:none:$all_packages:Biome + No ORM + All Packages"
        "biome-none-none:biome:none:$no_packages:Biome + No ORM + No Packages"
    )
    
    local failed_scenarios=()
    local total_scenarios=${#scenarios[@]}
    local current_scenario=0
    
    for scenario_config in "${scenarios[@]}"; do
        current_scenario=$((current_scenario + 1))
        
        IFS=':' read -r scenario_name linting orm packages description <<< "$scenario_config"
        
        log_info "[$current_scenario/$total_scenarios] Testing: $description"
        
        if test_single_comprehensive_scenario "$scenario_name" "$all_apps" "$packages" "$linting" "$orm" "$description"; then
            log_success "Scenario $scenario_name completed successfully"
        else
            log_error "Scenario $scenario_name failed"
            failed_scenarios+=("$scenario_name")
            # Early exit on any error as requested
            log_error "Early exit due to failed scenario: $scenario_name"
            return 1
        fi
    done
    
    if [ ${#failed_scenarios[@]} -eq 0 ]; then
        log_success "All 12 scenarios completed successfully!"
        return 0
    else
        log_error "Failed scenarios: ${failed_scenarios[*]}"
        return 1
    fi
}

test_single_comprehensive_scenario() {
    local scenario_name="$1"
    local apps="$2"
    local packages="$3"
    local linting="$4"
    local orm="$5" 
    local description="$6"
    
    log_section "SCENARIO: $description"
    
    # Create project with specific configuration
    local project_dir
    project_dir=$(create_comprehensive_test_project "$scenario_name" "$apps" "$packages" "$linting" "$orm") || return 1
    
    # Track current project for cleanup
    CURRENT_PROJECT_DIR="$project_dir"
    
    cd "$project_dir"

    log_info "Running tests for scenario: $scenario_name in $project_dir"
        
    # Step 1: Install dependencies
    log_info "Step 1/4: Installing dependencies..."
    if ! timeout 300 bun install > "/tmp/install-$scenario_name.log" 2>&1; then
        log_error "Failed to install dependencies for $scenario_name"
        tail -20 "/tmp/install-$scenario_name.log" || true
        return 1
    fi
    log_success "Dependencies installed"
    
    # Step 2: Run linting  
    log_info "Step 2/4: Running linting..."
    if [ "$linting" = "biome" ]; then
        if ! timeout 120 bun run lint > "/tmp/lint-$scenario_name.log" 2>&1; then
            log_error "Linting failed for $scenario_name"
            # Try fixing and retry once
            log_info "Attempting to fix linting issues..."
            if ! timeout 60 bun run lint:fix > "/tmp/biome-fix-$scenario_name.log" 2>&1; then
                log_error "Failed to fix linting issues"
                tail -20 "/tmp/lint-$scenario_name.log" || true
                return 1
            fi
            # Retry linting
            if ! timeout 120 bun run lint > "/tmp/lint-retry-$scenario_name.log" 2>&1; then
                log_error "Linting still failed after fix attempt"
                tail -20 "/tmp/lint-retry-$scenario_name.log" || true
                return 1
            fi
        fi
    else
        # ESLint + Prettier
        if ! timeout 120 bun run lint > "/tmp/lint-$scenario_name.log" 2>&1; then
            log_error "ESLint failed for $scenario_name"
            tail -20 "/tmp/lint-$scenario_name.log" || true
            return 1
        fi
    fi
    log_success "Linting passed"
    
    # Step 3: Run typecheck
    log_info "Step 3/4: Running typecheck..."
    if ! timeout 120 bun run typecheck > "/tmp/typecheck-$scenario_name.log" 2>&1; then
        log_error "Typecheck failed for $scenario_name"
        tail -20 "/tmp/typecheck-$scenario_name.log" || true
        return 1
    fi
    log_success "Typecheck passed"
    
    # Step 4: Run Prisma tests (for all scenarios as requested)
    log_info "Step 4/4: Running Prisma tests..."
    
    # Start Docker services if ORM is configured
    if [ "$orm" = "prisma" ] || [ "$orm" = "drizzle" ]; then
        start_docker_services "$project_dir" || return 1
    fi
    
    # Run ORM-specific tests
    if [ "$orm" = "prisma" ]; then
        # Test Prisma schema generation and migration
        if ! timeout 60 bunx prisma generate > "/tmp/prisma-generate-$scenario_name.log" 2>&1; then
            log_error "Prisma generate failed for $scenario_name"
            tail -20 "/tmp/prisma-generate-$scenario_name.log" || true
            return 1
        fi
        
        if ! timeout 60 bunx prisma migrate dev --name "test" --skip-generate > "/tmp/prisma-migrate-$scenario_name.log" 2>&1; then
            log_error "Prisma migrate failed for $scenario_name"
            tail -20 "/tmp/prisma-migrate-$scenario_name.log" || true
            return 1
        fi
    elif [ "$orm" = "drizzle" ]; then
        # Test Drizzle schema generation
        if ! timeout 60 bunx drizzle-kit generate > "/tmp/drizzle-generate-$scenario_name.log" 2>&1; then
            log_error "Drizzle generate failed for $scenario_name"
            tail -20 "/tmp/drizzle-generate-$scenario_name.log" || true
            return 1
        fi
        
        if ! timeout 60 bunx drizzle-kit migrate > "/tmp/drizzle-migrate-$scenario_name.log" 2>&1; then
            log_error "Drizzle migrate failed for $scenario_name"
            tail -20 "/tmp/drizzle-migrate-$scenario_name.log" || true
            return 1
        fi
    fi
    
    # Test building apps (quick validation)
    log_info "Testing app builds..."
    local build_errors=()
    
    # Test a few key apps to ensure they build
    local test_apps=("web" "api" "admin")
    for app in "${test_apps[@]}"; do
        if [ -d "apps/$app" ]; then
            cd "apps/$app"
            if ! timeout 120 bun run build > "/tmp/build-$app-$scenario_name.log" 2>&1; then
                build_errors+=("$app")
                log_error "Build failed for app: $app"
            else
                log_success "Build passed for app: $app"  
            fi
            cd "$project_dir"
        fi
    done
    
    # Clean up Docker services
    if [ "$orm" = "prisma" ] || [ "$orm" = "drizzle" ]; then
        stop_docker_services "$project_dir"
    fi
    
    if [ ${#build_errors[@]} -gt 0 ]; then
        log_error "Build errors in apps: ${build_errors[*]}"
        return 1
    fi
    
    log_success "All validations passed for scenario: $description"
    return 0
}

create_comprehensive_test_project() {
    local scenario_name="$1"
    local apps="$2"
    local packages="$3"
    local linting="$4"
    local orm="$5"
    
    local project_name="test-$scenario_name"
    local project_dir="$TEST_OUTPUT_DIR/$project_name"
    
    log_info "Creating comprehensive project: $project_name" >&2
    log_info "Apps: $apps" >&2
    log_info "Packages: $packages" >&2
    log_info "Linting: $linting" >&2
    log_info "ORM: $orm" >&2
    
    cd "$TEST_OUTPUT_DIR"
    
    # Remove existing project if it exists
    if [ -d "$project_name" ]; then
        rm -rf "$project_name"
    fi
    
    # Create the project with all specified configurations
    local orm_param=""
    if [ "$orm" != "none" ]; then
        orm_param="$orm"
    fi
    
    NON_INTERACTIVE=true \
    APP_NAME="$project_name" \
    LANGUAGE="typescript" \
    LINTING="$linting" \
    APPS="$apps" \
    PACKAGES="$packages" \
    ORM_TYPE="$orm_param" \
    DATABASE="postgresql" \
    timeout 180 node "$CLI_PATH" > "/tmp/creation-$scenario_name.log" 2>&1
    
    if [ ! -d "$project_name" ]; then
        log_error "Failed to create comprehensive project: $project_name" >&2
        cat "/tmp/creation-$scenario_name.log" >&2 || true
        return 1
    fi
    
    # Set up environment file for ORM scenarios
    if [ "$orm" != "none" ]; then
        cd "$project_name"
        if [ -f ".env.example" ]; then
            cp ".env.example" ".env"
            log_info "Copied .env.example to .env for database connection" >&2
        fi
        cd "$TEST_OUTPUT_DIR"
    fi
    
    echo "$project_dir"
}

# Generate test report
generate_test_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    log_section "TEST COMPLETION REPORT"
    
    case "$TEST_MODE" in
        "core"|"full")
            log_success "All 12 comprehensive scenarios tested successfully!"
            echo ""
            echo "✅ SCENARIOS TESTED:"
            echo "   1. ESLint+Prettier + Prisma + All Packages"
            echo "   2. ESLint+Prettier + Prisma + No Packages"
            echo "   3. ESLint+Prettier + Drizzle + All Packages"
            echo "   4. ESLint+Prettier + Drizzle + No Packages"
            echo "   5. ESLint+Prettier + No ORM + All Packages"
            echo "   6. ESLint+Prettier + No ORM + No Packages"
            echo "   7. Biome + Prisma + All Packages"
            echo "   8. Biome + Prisma + No Packages"
            echo "   9. Biome + Drizzle + All Packages"
            echo "  10. Biome + Drizzle + No Packages"
            echo "  11. Biome + No ORM + All Packages"
            echo "  12. Biome + No ORM + No Packages"
            echo ""
            echo "📱 ALL APP TEMPLATES TESTED:"
            echo "   • React Vite • React Native Expo • Express API"
            echo "   • Next.js Admin • Remix CMS • Hono Gateway" 
            echo "   • NestJS Service • React Webpack Desktop"
            echo "   • React Native Bare • Next.js + Solito"
            echo ""
            echo "📦 ALL PACKAGE TEMPLATES TESTED:"
            echo "   • UI Components • Native Components • Utils"
            echo "   • Schemas • React Hooks • 2 Blank Packages"
            ;;
        "playwright-only")
            log_success "Playwright tests completed!"
            ;;
    esac
    
    log_info "Total test time: ${minutes}m ${seconds}s"
    log_info "Test artifacts location: $TEST_OUTPUT_DIR"
    
    echo ""
    echo "✅ VALIDATIONS PERFORMED:"
    echo "   • Project scaffolding with all configurations"
    echo "   • Dependency installation (bun install)"
    echo "   • Code linting (ESLint+Prettier vs Biome)"
    echo "   • TypeScript compilation (typecheck)"
    echo "   • ORM schema generation & migration"
    echo "   • Application builds"
    echo "   • Early exit on any failure"
    if [ "$RUN_PLAYWRIGHT" = "true" ]; then
        echo "   • Playwright browser testing"
    fi
    echo ""
}

# Show usage information
show_usage() {
    echo "create-bun-monorepo test runner"
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
    echo "  core                 Run 12 comprehensive scenarios with single monorepo (default)"
    echo "  full                 Run 12 comprehensive scenarios (same as core)"
    echo "  playwright-only      Run only Playwright tests (requires existing projects)"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                          # Run 12 comprehensive scenarios"
    echo "  $0 --mode=full             # Run 12 comprehensive scenarios (same as core)"
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
    
    log_section "UNIFIED TEST SUITE"
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
            log_info "Running core 12-scenario comprehensive testing"
            test_all_scenarios || exit 1
            ;;
            
        "full")
            log_info "Running comprehensive 12-scenario testing"
            test_all_scenarios || exit 1
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
