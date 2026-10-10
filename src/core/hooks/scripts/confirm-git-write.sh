#!/bin/sh
# PreToolUse hook: force a permission prompt for commit/push/pull-request commands.
# Reinforces the policy in policy.md: each of these needs the user's explicit confirmation.
cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Agent workflow policy: committing, pushing, and creating, updating or merging pull requests each need the user's explicit confirmation for that specific action."}}
EOF
