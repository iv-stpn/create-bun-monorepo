#!/usr/bin/env bash

# Clean script to remove all dist and node_modules folders recursively
# This helps reduce project size and ensures clean rebuilds

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🧹 Cleaning project..."
echo "Project root: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

# Function to safely remove directories (only top-level, not nested)
safe_remove() {
    local dir_pattern="$1"
    local description="$2"
    
    echo "Searching for $description..."
    
    # Find all directories matching the pattern
    local temp_file=$(mktemp)
    find . -name "$dir_pattern" -type d 2>/dev/null > "$temp_file"
    
    # Filter out nested directories (directories that are inside other matching directories)
    local filtered_dirs=()
    while IFS= read -r current_dir; do
        local is_nested=false
        
        # Check if current_dir is nested inside any other directory from the list
        while IFS= read -r other_dir; do
            # Skip if comparing with itself
            if [ "$current_dir" = "$other_dir" ]; then
                continue
            fi
            
            # Check if current_dir is nested within other_dir
            if [[ "$current_dir" == "$other_dir"/* ]]; then
                is_nested=true
                break
            fi
        done < "$temp_file"
        
        if [ "$is_nested" = false ]; then
            filtered_dirs+=("$current_dir")
        fi
    done < "$temp_file"
    
    rm "$temp_file"
    
    local count=${#filtered_dirs[@]}
    
    if [ "$count" -gt 0 ]; then
        echo "Found $count top-level $description folder(s):"
        for dir in "${filtered_dirs[@]}"; do
            echo "  - $dir"
        done
        
        echo "Removing $description folders..."
        for dir in "${filtered_dirs[@]}"; do
            if [ -d "$dir" ]; then
                rm -rf "$dir" 2>/dev/null || true
            fi
        done
        echo "✅ Removed $count $description folder(s)"
    else
        echo "✅ No $description folders found"
    fi
    echo ""
}

# Remove node_modules directories
safe_remove "node_modules" "node_modules"

# Remove dist directories
safe_remove "dist" "dist"

# Remove build directories (common alternative build output)
safe_remove "build" "build"

# Remove .next directories (Next.js build output)
safe_remove ".next" ".next"

# Remove out directories (common build output)
safe_remove "out" "out"

# Remove coverage directories
safe_remove "coverage" "coverage"

# Remove .turbo directories (Turbo cache)
safe_remove ".turbo" ".turbo"

# Remove .cache directories
safe_remove ".cache" "cache"

# Show final project size
echo "📊 Final project size:"
if command -v du >/dev/null 2>&1; then
    du -sh . 2>/dev/null || echo "Size calculation unavailable"
else
    echo "Size calculation unavailable (du not found)"
fi

echo ""
echo "🎉 Project cleaned successfully!"
echo ""
echo "Next steps:"
echo "  bun install    # Reinstall dependencies"
echo "  bun run build  # Rebuild the project"
