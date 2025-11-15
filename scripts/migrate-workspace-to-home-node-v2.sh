#!/bin/bash
set -e

# FOCUSED MIGRATION SCRIPT: /workspace to /home/node (v2)
# Purpose: Migrate existing apps from old architecture to new home-node structure
# Created: 2025-11-11 for Ticket #085
# Incorporates lessons learned from Tickets #082, #084

# ============================================
# SCRIPT CONFIGURATION
# ============================================

SCRIPT_VERSION="2.0"
LOG_FILE="/tmp/migration-$(date +%Y%m%d_%H%M%S).log"
BACKUP_DIR="/tmp/migration-backup-$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# LOGGING FUNCTIONS
# ============================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# ============================================
# SAFETY FUNCTIONS
# ============================================

check_environment() {
    log_info "Checking environment compatibility..."

    # Check if running in Fly.io container
    if [ ! -f "/.fly-mounted" ] && [ ! -d "/app" ]; then
        log_error "This doesn't appear to be a Fly.io container"
        log_error "Expected to find /.fly-mounted or /app directory"
        return 1
    fi

    # Check if workspace exists
    if [ ! -d "/workspace" ]; then
        log_error "No /workspace directory found"
        log_error "This app may already be using the new architecture or never had data"
        return 1
    fi

    # Check if workspace has our marker file
    if [ ! -f "/workspace/CLAUDE.md" ]; then
        log_warning "No CLAUDE.md found in /workspace"
        log_warning "This may not be a properly initialized My Jarvis workspace"
        echo -e "${YELLOW}Continue anyway? (y/N):${NC} "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "Migration cancelled by user"
            return 1
        fi
    fi

    log_success "Environment check passed"
    return 0
}

check_migration_status() {
    log_info "Checking if migration already completed..."

    # If /home/node has CLAUDE.md but /workspace doesn't, already migrated
    if [ -f "/home/node/CLAUDE.md" ] && [ ! -f "/workspace/CLAUDE.md" ]; then
        log_success "Migration already completed!"
        log_info "CLAUDE.md found in /home/node, removed from /workspace"
        show_current_status
        return 1  # Exit with "error" to stop migration
    fi

    # If both have CLAUDE.md, partial migration
    if [ -f "/home/node/CLAUDE.md" ] && [ -f "/workspace/CLAUDE.md" ]; then
        log_warning "Partial migration detected!"
        log_warning "CLAUDE.md found in both locations"
        echo -e "${YELLOW}This suggests a previous migration was interrupted.${NC}"
        echo -e "${YELLOW}Continue to complete migration? (y/N):${NC} "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "Migration cancelled by user"
            return 1
        fi
    fi

    return 0
}

calculate_space_requirements() {
    log_info "Calculating space requirements..."

    workspace_size=$(du -sb /workspace 2>/dev/null | cut -f1 || echo "0")
    available_space=$(df /home/node 2>/dev/null | tail -1 | awk '{print $4 * 1024}' || echo "999999999999")

    workspace_size_mb=$((workspace_size / 1024 / 1024))
    available_space_mb=$((available_space / 1024 / 1024))

    log_info "Workspace size: ${workspace_size_mb}MB"
    log_info "Available space: ${available_space_mb}MB"

    if [ "$workspace_size" -gt "$available_space" ]; then
        log_error "Insufficient space for migration!"
        log_error "Need ${workspace_size_mb}MB, only ${available_space_mb}MB available"
        return 1
    fi

    # Require 20% extra space for safety
    safety_space=$((workspace_size * 120 / 100))
    if [ "$safety_space" -gt "$available_space" ]; then
        log_warning "Tight space situation (recommend 20% buffer)"
        log_warning "Continuing but monitor disk space closely..."
    fi

    log_success "Space requirements satisfied"
    return 0
}

# ============================================
# BACKUP FUNCTIONS
# ============================================

create_backups() {
    log_info "Creating safety backups..."

    mkdir -p "$BACKUP_DIR"

    # Backup any existing /home/node content
    if [ -d "/home/node" ] && [ "$(ls -A /home/node 2>/dev/null)" ]; then
        log_info "Backing up existing /home/node content..."
        cp -a /home/node/* "$BACKUP_DIR/home-node-backup/" 2>/dev/null || true
        cp -a /home/node/.* "$BACKUP_DIR/home-node-backup/" 2>/dev/null || true
        log_success "Existing /home/node content backed up"
    fi

    # Backup critical workspace files
    log_info "Backing up critical workspace files..."
    mkdir -p "$BACKUP_DIR/workspace-critical/"

    if [ -f "/workspace/CLAUDE.md" ]; then
        cp "/workspace/CLAUDE.md" "$BACKUP_DIR/workspace-critical/"
    fi

    if [ -f "/workspace/.claude.json" ]; then
        cp "/workspace/.claude.json" "$BACKUP_DIR/workspace-critical/"
    fi

    if [ -d "/workspace/.claude" ]; then
        cp -a "/workspace/.claude" "$BACKUP_DIR/workspace-critical/"
    fi

    log_success "Critical files backed up to: $BACKUP_DIR"
    return 0
}

# ============================================
# MIGRATION FUNCTIONS
# ============================================

prepare_home_node() {
    log_info "Preparing /home/node directory..."

    # Create /home/node if it doesn't exist
    if [ ! -d "/home/node" ]; then
        log_info "Creating /home/node directory..."
        mkdir -p /home/node
    else
        # Clean existing content but preserve authentication
        log_info "Cleaning existing /home/node content..."

        # Preserve Claude authentication if it exists
        if [ -f "/home/node/.claude.json" ] && grep -q "userID\|apiKey" /home/node/.claude.json 2>/dev/null; then
            log_info "Preserving Claude authentication..."
            cp /home/node/.claude.json "$BACKUP_DIR/claude-auth-backup.json"
        fi

        # Remove all content from /home/node
        rm -rf /home/node/* 2>/dev/null || true
        rm -rf /home/node/.* 2>/dev/null || true
    fi

    log_success "Home node directory prepared"
    return 0
}

copy_workspace_data() {
    log_info "Copying workspace data to /home/node..."
    log_info "This may take a few minutes for large workspaces..."

    # Use rsync for better progress and error handling
    if command -v rsync >/dev/null 2>&1; then
        log_info "Using rsync for optimized copying..."
        rsync -av --progress /workspace/ /home/node/ 2>&1 | tee -a "$LOG_FILE"
    else
        log_info "Using cp for data copying..."
        cp -a /workspace/. /home/node/
    fi

    # Verify critical files were copied
    if [ ! -f "/home/node/CLAUDE.md" ] && [ -f "/workspace/CLAUDE.md" ]; then
        log_error "Critical file CLAUDE.md failed to copy!"
        return 1
    fi

    log_success "Workspace data copied successfully"
    return 0
}

fix_permissions() {
    log_info "Fixing file ownership and permissions..."

    # Set ownership to node:node
    chown -R node:node /home/node

    # Ensure proper permissions for key directories
    chmod 755 /home/node

    if [ -d "/home/node/tools" ]; then
        chmod -R 755 /home/node/tools
    fi

    log_success "Permissions fixed"
    return 0
}

update_claude_configuration() {
    log_info "Updating Claude configuration for new architecture..."

    # Create/update .claude.json with projects object for /home/node
    log_info "Creating new .claude.json with proper projects object..."

    # Preserve existing Claude metadata if it exists
    user_id=""
    install_method=""
    cached_gates="{}"

    if [ -f "/home/node/.claude.json" ]; then
        if command -v jq >/dev/null 2>&1; then
            user_id=$(jq -r '.userID // ""' /home/node/.claude.json 2>/dev/null)
            install_method=$(jq -r '.installMethod // ""' /home/node/.claude.json 2>/dev/null)
            cached_gates=$(jq -r '.cachedStatsigGates // {}' /home/node/.claude.json 2>/dev/null)
        fi
    fi

    # Restore authentication from backup if needed
    if [ -f "$BACKUP_DIR/claude-auth-backup.json" ]; then
        log_info "Restoring Claude authentication..."
        if command -v jq >/dev/null 2>&1; then
            backup_user_id=$(jq -r '.userID // ""' "$BACKUP_DIR/claude-auth-backup.json" 2>/dev/null)
            if [ -n "$backup_user_id" ] && [ "$backup_user_id" != "null" ]; then
                user_id="$backup_user_id"
            fi
        fi
    fi

    # Create new .claude.json with proper structure
    cat > /home/node/.claude.json <<EOF
{
  "installMethod": "${install_method:-npm}",
  "autoUpdates": true,
  "cachedStatsigGates": $cached_gates,
  "projects": {
    "/home/node": {
      "allowedTools": ["Read", "Write", "Edit", "Bash"],
      "history": [],
      "mcpServers": {},
      "exampleFiles": [],
      "mcpContextUris": []
    }
  }$(if [ -n "$user_id" ] && [ "$user_id" != "null" ]; then echo ",
  \"userID\": \"$user_id\""; fi)
}
EOF

    chown node:node /home/node/.claude.json
    chmod 600 /home/node/.claude.json

    log_success "Claude configuration updated"

    # Update Claude history directory names
    if [ -d "/home/node/.claude/projects" ]; then
        log_info "Updating Claude history directory names..."

        # Rename workspace history directories
        for old_dir in "/home/node/.claude/projects/-workspace" "/home/node/.claude/projects/--workspace"; do
            if [ -d "$old_dir" ]; then
                log_info "Renaming $(basename "$old_dir") → -home-node"
                mv "$old_dir" "/home/node/.claude/projects/-home-node"
                break
            fi
        done

        # Fix ownership of .claude directory
        chown -R node:node /home/node/.claude
        log_success "Claude history directories updated"
    fi

    return 0
}

# ============================================
# VALIDATION FUNCTIONS
# ============================================

validate_migration() {
    log_info "Validating migration success..."

    # Check critical files exist in new location
    if [ ! -f "/home/node/CLAUDE.md" ]; then
        log_error "CLAUDE.md missing in /home/node"
        return 1
    fi

    if [ ! -f "/home/node/.claude.json" ]; then
        log_error ".claude.json missing in /home/node"
        return 1
    fi

    # Verify .claude.json has correct projects object
    if ! grep -q '"/home/node"' /home/node/.claude.json; then
        log_error ".claude.json missing /home/node projects object"
        return 1
    fi

    # Check file ownership
    if [ "$(stat -c '%U' /home/node)" != "node" ]; then
        log_error "/home/node ownership incorrect"
        return 1
    fi

    # Compare file counts (rough validation)
    workspace_files=$(find /workspace -type f 2>/dev/null | wc -l)
    homenode_files=$(find /home/node -type f 2>/dev/null | wc -l)

    if [ "$homenode_files" -lt "$((workspace_files * 90 / 100))" ]; then
        log_warning "File count seems low (${homenode_files} vs ${workspace_files})"
        log_warning "Manual verification recommended"
    else
        log_success "File count validation passed (${homenode_files} files)"
    fi

    log_success "Migration validation passed"
    return 0
}

show_current_status() {
    log_info "Current migration status:"
    echo ""
    echo "📁 /workspace:"
    ls -la /workspace/ 2>/dev/null | head -10 || echo "  (empty or inaccessible)"
    echo ""
    echo "📁 /home/node:"
    ls -la /home/node/ 2>/dev/null | head -10 || echo "  (empty or inaccessible)"
    echo ""

    # Show .claude.json content if it exists
    if [ -f "/home/node/.claude.json" ]; then
        echo "🔧 Claude configuration (/home/node/.claude.json):"
        if command -v jq >/dev/null 2>&1; then
            jq '.projects' /home/node/.claude.json 2>/dev/null || cat /home/node/.claude.json
        else
            grep -A 10 '"projects"' /home/node/.claude.json 2>/dev/null || echo "  (exists but cannot parse)"
        fi
        echo ""
    fi
}

# ============================================
# MAIN MIGRATION FLOW
# ============================================

main() {
    echo ""
    echo "=============================================="
    echo "  MY JARVIS MIGRATION v${SCRIPT_VERSION}"
    echo "  /workspace → /home/node"
    echo "=============================================="
    echo ""
    echo "This script will migrate your data from the old /workspace"
    echo "architecture to the new /home/node structure with proper"
    echo "Claude configuration for chat history support."
    echo ""

    log_info "Starting migration process..."
    log_info "Log file: $LOG_FILE"
    log_info "Backup directory: $BACKUP_DIR"
    echo ""

    # Pre-migration checks
    if ! check_environment; then
        log_error "Environment check failed"
        exit 1
    fi

    if ! check_migration_status; then
        log_info "Migration not needed or cancelled"
        exit 0
    fi

    if ! calculate_space_requirements; then
        log_error "Space check failed"
        exit 1
    fi

    # Show current state
    show_current_status

    # Final confirmation
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: This will copy all data from /workspace to /home/node${NC}"
    echo -e "${YELLOW}   Original data in /workspace will remain untouched as backup${NC}"
    echo ""
    echo -e "${BLUE}Proceed with migration? (y/N):${NC} "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "Migration cancelled by user"
        exit 0
    fi

    # Execute migration steps
    log_info "Beginning migration steps..."

    if ! create_backups; then
        log_error "Backup creation failed"
        exit 1
    fi

    if ! prepare_home_node; then
        log_error "Home node preparation failed"
        exit 1
    fi

    if ! copy_workspace_data; then
        log_error "Data copying failed"
        exit 1
    fi

    if ! fix_permissions; then
        log_error "Permission fixing failed"
        exit 1
    fi

    if ! update_claude_configuration; then
        log_error "Claude configuration update failed"
        exit 1
    fi

    if ! validate_migration; then
        log_error "Migration validation failed"
        exit 1
    fi

    # Success!
    echo ""
    echo "=============================================="
    echo -e "  ${GREEN}✅ MIGRATION COMPLETED SUCCESSFULLY!${NC}"
    echo "=============================================="
    echo ""
    log_success "Migration completed successfully!"

    echo "📋 Summary:"
    echo "  • Data copied from /workspace to /home/node"
    echo "  • File ownership set to node:node"
    echo "  • Claude configuration updated with /home/node projects object"
    echo "  • Chat history directories renamed appropriately"
    echo ""

    echo "🔄 Next Steps Required:"
    echo "  1. Update your fly.toml mount destination:"
    echo "     [mounts]"
    echo "       source = \"workspace_data\""
    echo "       destination = \"/home/node\"  # Changed from /workspace"
    echo ""
    echo "  2. Redeploy your application:"
    echo "     fly deploy --app YOUR_APP_NAME"
    echo ""
    echo "  3. After redeployment, verify:"
    echo "     • App loads at https://YOUR_APP_NAME.fly.dev"
    echo "     • Chat history is preserved and functional"
    echo "     • Voice generation works"
    echo ""

    echo "📁 Backups saved to: $BACKUP_DIR"
    echo "📝 Full log available at: $LOG_FILE"
    echo ""

    echo -e "${YELLOW}Note: /workspace data remains as backup until redeployment${NC}"
    echo -e "${YELLOW}      After successful verification, /workspace will be removed${NC}"
    echo ""
}

# ============================================
# SCRIPT EXECUTION
# ============================================

# Handle script interruption
trap 'log_error "Migration interrupted by user"; exit 130' INT TERM

# Run main function
main "$@"