#!/usr/bin/env bash
set -e

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
git add .

echo "=== 5. Creating Commit ==="
if git status --porcelain | grep -q .; then
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
