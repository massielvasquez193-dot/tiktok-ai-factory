#!/bin/bash
set -e
echo "=== Committing changes ==="
git commit -m "v2.1 Full SaaS platform release - Auth, Payments, Admin, Tenant, Tencent Cloud deploy, CI/CD" || echo "Commit may have failed"
echo ""
echo "=== Pushing to GitHub ==="
git push origin main 2>&1 || echo "Push may have failed"
echo ""
echo "=== Done ==="
