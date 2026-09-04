#!/usr/bin/env bash
#
# One-shot script: applies the parts of this PR that the agent sandbox is not
# allowed to perform itself (it cannot write or delete under .github/workflows/).
#
# Run it from anywhere inside the repository, on the fix/gate-dokploy-deploy branch:
#
#     ./ops/ci/apply-public-cleanup.sh
#     git commit --amend --no-edit   # optional: fold it into the existing commit
#     git push --force-with-lease
#
# It does two things:
#   1. Moves the corrected "Build and Push" workflow into place.
#   2. Deletes the Claude Code workflow, which on a public repository lets any
#      GitHub user spend the CLAUDE_CODE_OAUTH_TOKEN by commenting "@claude".
#
# Then it removes itself, so nothing of this staging scaffolding is left behind.
#
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

git mv ops/ci/build.yml .github/workflows/build.yml
git rm -q .github/workflows/claude.yml

# Drop the staging banner from the workflow: everything before "name: Build and Push".
sed -i '1,/^name: Build and Push$/{/^name: Build and Push$/!d}' .github/workflows/build.yml
git add .github/workflows/build.yml

git rm -q ops/ci/apply-public-cleanup.sh
rmdir ops/ci ops 2>/dev/null || true

echo "Done. Review with: git status && git diff --cached"
