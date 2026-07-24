#!/usr/bin/env bash
set -Eeuo pipefail

# Trap errors and report which line/command failed
trap 'echo "ERROR: Script failed at line $LINENO (last command: $BASH_COMMAND)" >&2' ERR

# --- Preconditions ---
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm not found in PATH." >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "ERROR: git not found in PATH." >&2; exit 1; }
[ -f "package.json" ] || { echo "ERROR: package.json not found. Run this from the project root." >&2; exit 1; }

echo "=== 1. Running Lint Check (TypeScript) ==="
npm run lint

echo "=== 2. Running Production Build Check ==="
npm run build

echo "=== 3. Checking Git Repository Status ==="
if [ ! -d ".git" ]; then
  echo "Initializing local Git repository..."
  git init -b main
  git config user.name "CommuteBrief Agent"
  git config user.email "agent@commutebrief.local"
fi

echo "=== 4. Staging Files ==="
git add -A

echo "=== 5. Creating Commit ==="
if ! git diff --cached --quiet; then
  git commit -m "fix: resolve lint/build issues and prepare repository for GitHub push"
  echo "Commit created successfully."
else
  echo "Working directory clean, nothing new to commit."
fi

echo ""
echo "=========================================================="
echo " Verification Complete! All lint and build checks passed. "
echo " To push to GitHub:"
echo "   1) Set your remote repository URL:"
echo "      git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git"
echo "   2) Push to main branch:"
echo "      git push -u origin main"
echo " Alternatively, use AI Studio Settings menu -> Export to GitHub."
echo "=========================================================="
