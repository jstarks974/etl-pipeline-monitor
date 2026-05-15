#!/usr/bin/env bash
# scripts/setup.sh
# Run once to install dependencies, verify environment, and seed db
# Use: bash scripts/setup.sh

set -e  

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # no color

ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; exit 1; }

echo ""
echo "============================================"
echo "  ETL Pipeline Monitor — Setup"
echo "============================================"
echo ""

# Check in the project root 
if [ ! -f "package.json" ]; then
  fail "Run this script from the project root (where package.json lives)."
fi
ok "Project root confirmed"

# Check Node.js 
if ! command -v node &>/dev/null; then
  fail "Node.js is not installed. Download it from https://nodejs.org"
fi

NODE_VERSION=$(node -e "process.stdout.write(process.versions.node)")
MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if [ "$MAJOR" -lt 18 ]; then
  fail "Node.js v18+ required. You have v$NODE_VERSION. Update at https://nodejs.org"
fi
ok "Node.js v$NODE_VERSION"

# Check npm 
if ! command -v npm &>/dev/null; then
  fail "npm not found. It should come with Node.js."
fi
ok "npm $(npm -v)"

# Install dependencies 
echo ""
echo "  Installing npm packages..."
npm install --silent
ok "Dependencies installed"

# Verify required packages are present 
REQUIRED=("express" "better-sqlite3" "node-cron" "cors")
for pkg in "${REQUIRED[@]}"; do
  if [ ! -d "node_modules/$pkg" ]; then
    fail "Package '$pkg' missing. Run: npm install $pkg"
  fi
done
ok "All required packages present"

# Create db directory if missing
mkdir -p server/db
ok "server/db directory ready"

# Seed the database 
echo ""
echo "  Seeding database..."
node scripts/seed.js
ok "Database seeded"

# Done 
echo ""
echo "============================================"
echo -e "  ${GREEN}Setup complete!${NC}"
echo "============================================"
echo ""
echo "  Start the server:   node server/index.js"
echo "  Open in browser:    http://localhost:3000"
echo ""