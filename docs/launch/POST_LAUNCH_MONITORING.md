# Post-Launch Monitoring Guide

> **Platform**: TikTok AI Factory v1.1 SaaS
> **Release**: RC1 — Public Beta
> **Period**: First 7 days post-launch

---

## Monitoring Schedule

| Check | Frequency | Owner | Tool |
|-------|-----------|-------|------|
| Server health | Every 15 min (first 4h) → Every hour | DevOps | `/api/health` |
| New signups | Every 30 min | Product | SQL query |
| Error count | Continuous | DevOps | `docker logs` |
| Credit consumption | Hourly | Product | SQL query |
| Stripe payments | Every 30 min | Finance | Stripe dashboard |
| Disk usage | Every 6 hours | DevOps | `df -h` |
| SSL expiry | Weekly | DevOps | `openssl s_client` |
| Backup | Daily | DevOps | `./backup.sh` |

---

## Critical Metrics Dashboard

```bash
#!/bin/bash
# Save as: /opt/tiktok-video-factory/monitor.sh
# Run: watch -n 300 ./monitor.sh

echo "═══════════════════════════════════════════"
echo "  $(date) — Platform Health"
echo "═══════════════════════════════════════════"

echo ""
echo "── Containers ──"
docker ps --filter name=tiktok --format "{{.Names}}: {{.Status}}"

echo ""
echo "── API Health ──"
curl -s http://localhost:4000/api/health

echo ""
echo "── User Stats ──"
docker exec tiktok-vf-db psql -U tiktok -d tiktok_video_factory -t -c "
SELECT 'Total users: ' || count(*) FROM users;
SELECT 'Active today: ' || count(*) FROM users WHERE updated_at > now() - interval '24 hours';
SELECT 'New workspaces (24h): ' || count(*) FROM workspaces WHERE created_at > now() - interval '24 hours';
SELECT 'Credits consumed (24h): ' || COALESCE(sum(abs(amount)),0) FROM credit_transactions WHERE type='consume' AND created_at > now() - interval '24 hours';
SELECT 'Publishing jobs (24h): ' || count(*) FROM publishing_jobs WHERE created_at > now() - interval '24 hours';
"

echo ""
echo "── Error Rate (15 min) ──"
docker logs tiktok-vf-server --since 15m 2>&1 | grep -c "Error"

echo ""
echo "── Resources ──"
echo "Disk: $(df -h / | tail -1 | awk '{print $5}')"
echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
```

---

## Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API response time | >500ms | >2000ms | Check DB connections, restart server |
| Error rate (15 min) | >10 | >50 | Investigate logs, rollback if >100 |
| Disk usage | >70% | >85% | `docker system prune`, delete old logs |
| Memory usage | >80% | >90% | Restart containers, add swap |
| New user rate | 0 in 4h | 0 in 24h | Check registration page, DNS |
| Credit consumption | >1000/hr | >5000/hr | Rate limit, check for abuse |
| Failed payments | >5% | >20% | Check Stripe configuration |
| Server uptime | <99.9% | <99% | Investigate, scale if needed |

---

## Daily Health Report Template

```
═══════════════════════════════════════════
  DAILY HEALTH REPORT — Day X
  TikTok AI Factory — Public Beta
═══════════════════════════════════════════

Infrastructure:
  Containers: 5/5 healthy
  API health: OK
  SSL: Valid (XX days remaining)
  Disk: XX% used (XX GB free)
  Memory: XX GB used / XX GB total

Users:
  Total: XX
  New today: XX
  Workspaces: XX
  Avg sessions per user: XX

AI Operations:
  Scripts generated: XX
  Videos generated: XX
  Publishing jobs: XX
  Credits consumed: XX

Revenue:
  New subscriptions: XX
  Payments processed: XX
  Failed payments: XX
  MRR: $XX

Errors & Incidents:
  Server errors (24h): XX
  Critical incidents: XX
  Resolved: XX

Actions:
  - [ ] Create daily backup
  - [ ] Review error logs
  - [ ] Check Stripe dashboard
  - [ ] Respond to support tickets
```

---

## Incident Response

### Level 1: Minor (non-blocking)
**Examples**: Slow API, occasional 500, cosmetic bugs
**Response**: Log issue, fix in next sprint, no rollback needed

### Level 2: Major (degraded functionality)
**Examples**: Auth broken for some users, credits not deducting, video gen failing
**Response**: Investigate immediately, fix within 2 hours, notify affected users

### Level 3: Critical (platform down)
**Examples**: API not responding, database corruption, payment gateway failure
**Response**: 
1. Instant rollback: `SAAS_MODE=false && docker compose up -d server`
2. Diagnose root cause
3. Fix and redeploy
4. Post-incident review within 24 hours

---

## First 7 Days Checklist

### Day 1 (Launch)
- [ ] All containers healthy
- [ ] First signups arrive
- [ ] 0 critical errors
- [ ] Backup created

### Day 2
- [ ] Review error logs
- [ ] Check Stripe webhook delivery
- [ ] Verify email delivery (if Resend configured)
- [ ] Monitor credit consumption patterns

### Day 3
- [ ] First support tickets reviewed
- [ ] Any UX friction points identified
- [ ] Disk cleanup if needed

### Day 4
- [ ] Performance review: API response times
- [ ] Database: vacuum, index usage
- [ ] SSL: verify auto-renewal configured

### Day 5
- [ ] Customer feedback collected
- [ ] Feature requests logged
- [ ] Bug fixes prioritized

### Day 6
- [ ] Weekly backup verified
- [ ] Restore procedure tested
- [ ] Security scan (npm audit, dependency check)

### Day 7
- [ ] Week 1 report: users, revenue, ops, errors
- [ ] Beta exit criteria reviewed
- [ ] Week 2 plan created

---

## Useful Diagnostic Commands

```bash
# Check all running services
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

# View recent errors
docker logs tiktok-vf-server --since 1h 2>&1 | grep -i error | tail -20

# Check database connections
docker exec tiktok-vf-db psql -U tiktok -d tiktok_video_factory -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state='active';"

# Check Redis memory
docker exec tiktok-vf-redis redis-cli INFO memory | grep used_memory_human

# Quick user stats
docker exec tiktok-vf-db psql -U tiktok -d tiktok_video_factory -c "
SELECT 
  (SELECT count(*) FROM users) as total_users,
  (SELECT count(*) FROM workspaces) as workspaces,
  (SELECT count(*) FROM subscriptions WHERE status='active') as active_subs,
  (SELECT sum(balance) FROM credit_wallets) as total_credits;
"

# Restart a service
docker compose -f docker-compose.prod.yml restart server

# Full restart
docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d
```
