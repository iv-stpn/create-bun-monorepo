#!/usr/bin/env bash

# Complete Test Script - Tests all 4 core scenarios with E2E and code quality validation
# This script runs the comprehensive testing required before commits/releases

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_PATH="$PROJECT_ROOT/dist/index.js"
TEST_OUTPUT_DIR="/tmp/bun-scaffolder-complete-test"

# Test timing
START_TIME=$(date +%s)

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

# Cleanup function
cleanup_test_environment() {
    if [ -n "$TEST_OUTPUT_DIR" ] && [ -d "$TEST_OUTPUT_DIR" ]; then
        log_info "Cleaning up test environment..."
        rm -rf "$TEST_OUTPUT_DIR" 2>/dev/null || true
    fi
    
    # Kill any remaining processes
    pkill -f "bun run dev" 2>/dev/null || true
    pkill -f "node.*dev" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
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
    ORM="$orm" \
    timeout 120 node "$CLI_PATH" > "/tmp/creation-$scenario_name.log" 2>&1
    
    if [ ! -d "$project_name" ]; then
        log_error "Failed to create project: $project_name" >&2
        cat "/tmp/creation-$scenario_name.log" >&2 || true
        return 1
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
        log_error "Lint failed for $scenario_name"
        tail -10 "/tmp/lint-$scenario_name.log" || true
        return 1
    fi
    log_success "Lint passed for $scenario_name"
    
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
            cd "$project_dir/$app_dir"
            
            # Determine expected port based on template
            local expected_port="3000"  # Default
            if grep -q "vite" package.json 2>/dev/null; then
                expected_port="3000"
            elif grep -q "next.*dev.*-p 3002" package.json 2>/dev/null; then
                expected_port="3002"
            elif grep -q "remix" package.json 2>/dev/null; then
                expected_port="3003"
            elif grep -q "express" package.json 2>/dev/null; then
                expected_port="3100"
            elif grep -q "hono" package.json 2>/dev/null; then
                expected_port="8000"
            elif grep -q "nestjs" package.json 2>/dev/null; then
                expected_port="3101"
            elif grep -q "expo" package.json 2>/dev/null; then
                expected_port="8081"
            elif grep -q "react-native" package.json 2>/dev/null; then
                expected_port="8080"
            fi
            
            log_info "Testing E2E for $app_name on port $expected_port..."
            
            # Start dev server in background
            timeout 45 bun run dev > "/tmp/e2e-$app_name-$scenario_name.log" 2>&1 &
            local server_pid=$!
            
            # Wait for server to start
            sleep 5
            
            # Test server response
            if test_server_response "$expected_port" 6 3; then
                log_success "E2E test passed for $app_name"
                kill $server_pid 2>/dev/null || true
                sleep 1
            else
                log_error "E2E test failed for $app_name"
                kill $server_pid 2>/dev/null || true
                log_info "Server logs for $app_name:"
                tail -15 "/tmp/e2e-$app_name-$scenario_name.log" || true
                return 1
            fi
        fi
    done
    
    cd "$project_dir"
    return 0
}

# Test complete scenario (create, validate quality, run E2E)
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
    
    # Validate code quality
    validate_code_quality "$project_dir" "$scenario_name" || return 1
    
    # Run E2E tests
    run_e2e_tests "$project_dir" "$scenario_name" || return 1
    
    log_success "Scenario '$description' completed successfully!"
    return 0
}

# Generate test report
generate_test_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    log_section "TEST COMPLETION REPORT"
    log_success "All 4 core scenarios tested successfully!"
    log_info "Total test time: ${minutes}m ${seconds}s"
    log_info "Test artifacts location: $TEST_OUTPUT_DIR"
    
    echo ""
    echo "✅ SCENARIOS TESTED:"
    echo "   1. All packages + Prisma ORM"
    echo "   2. All packages + Drizzle ORM"  
    echo "   3. UI packages only + Prisma ORM"
    echo "   4. UI packages only + Drizzle ORM"
    echo ""
    echo "✅ VALIDATIONS PERFORMED (per scenario):"
    echo "   • Project scaffolding"
    echo "   • Dependency installation"
    echo "   • TypeScript compilation"
    echo "   • Linting (Biome)"
    echo "   • App building"
    echo "   • E2E dev server testing"
    echo ""
}

# Main execution
main() {
    log_section "BUN MONOREPO SCAFFOLDER - COMPLETE TEST SUITE"
    log_info "Starting complete test suite at $(date)"
    log_info "This validates all 4 core scenarios with full quality checks and E2E tests"
    
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
    
    # Run all 4 core scenarios
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
    
    generate_test_report
}

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
