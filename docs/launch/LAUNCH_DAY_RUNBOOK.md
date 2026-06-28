# LAUNCH DAY RUNBOOK

> **Platform**: TikTok AI Factory v1.1 SaaS
> **Release**: RC1
> **Date**: 2026-06-28
> **Estimated Duration**: 3-4 hours
> **Required Personnel**: 1 DevOps/CTO

---

## T-24h: Pre-Launch Verification

### 1. Infrastructure Health (5 min)
```bash
docker ps --filter name=tiktok --format "{{.Names}} {{.Status}}"
# Expected: 5 containers, postgres+redis marked (healthy)

curl -s http://localhost:4000/api/health
# Expected: {"status":"ok","version":"1.0.0","saasMode":false}

df -h / | tail -1
# Expected: <80% used

free -h | head -2
# Expected: >500MB available
```

- [ ] 5 Docker containers healthy
- [ ] API health returns OK
- [ ] Disk <80%
- [ ] Memory >500MB available

### 2. Database Verification (5 min)
```bash
docker exec tiktok-vf-db psql -U tiktok -d tiktok_video_factory -c "SELECT count(*) as tables FROM information_schema.tables WHERE table_schema='public';"
docker exec tiktok-vf-db psql -U tiktok -d tiktok_video_factory -c "SELECT pg_size_pretty(pg_database_size('tiktok_video_factory')) as size;"
docker exec tiktok-vf-redis redis-cli PING
```
- [ ] 54+ tables exist
- [ ] Database size normal (<100MB)
- [ ] Redis PONG

### 3. Backup Verification (10 min)
```bash
cd /opt/tiktok-video-factory
./backup.sh
ls -la backups/db_backup_*.sql.gz | tail -1
```
- [ ] Fresh backup created
- [ ] File size >50KB
- [ ] Restore tested: `gunzip -c backups/db_backup_LATEST.sql.gz | head -20`

### 4. SSL Certificate Check (2 min)
```bash
openssl s_client -connect ttvideoai.com:443 -servername ttvideoai.com </dev/null 2>/dev/null | openssl x509 -noout -dates
```
- [ ] SSL certificate valid
- [ ] Expiry >30 days from today
- [ ] Issuer: Let's Encrypt

---

## T-12h: External Service Verification

### 5. DNS Checklist (5 min)
```bash
# Verify A record
dig +short ttvideoai.com

# Verify www redirect
curl -sI http://ttvideoai.com | head -2
curl -sI https://ttvideoai.com | head -2

# Verify API accessible externally
curl -s https://ttvideoai.com/api/health
```
- [ ] A record resolves to server IP
- [ ] HTTP → HTTPS redirect works (301)
- [ ] www.ttvideoai.com redirects to ttvideoai.com
- [ ] API health accessible over HTTPS

### 6. DeepSeek Verification (5 min)
```bash
# Test DeepSeek API key
curl -s https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer $(grep DEEPSEEK_API_KEY /opt/tiktok-video-factory/.env | cut -d= -f2)" | head -c 200
```
- [ ] DeepSeek API key valid
- [ ] Response contains model list (not error)

### 7. Seedance Verification (5 min)
```bash
# Seedance key is configured in .env
grep SEEDANCE_API_KEY /opt/tiktok-video-factory/.env | cut -d= -f2 | head -c 20
```
- [ ] Seedance API key present (>30 chars)
- [ ] Key format: `ark-...` (Volcengine Ark)

### 8. Stripe Checklist (when keys are set)
```bash
# Test Stripe API connectivity
curl -s https://api.stripe.com/v1/balance \
  -u "$(grep STRIPE_SECRET_KEY /opt/tiktok-video-factory/.env | cut -d= -f2):"
```
- [ ] Stripe secret key set
- [ ] Stripe public key set
- [ ] Webhook endpoint registered at https://dashboard.stripe.com/webhooks
- [ ] Webhook secret configured in .env
- [ ] Test mode: STRIPE_MODE=test → verify checkout
- [ ] Live mode: STRIPE_MODE=live → verify checkout

### 9. Resend Checklist (when keys are set)
```bash
# Test Resend API
curl -s -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $(grep RESEND_API_KEY /opt/tiktok-video-factory/.env | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"from":"noreply@ttvideoai.com","to":["test@ttvideoai.com"],"subject":"Test","text":"Hello"}'
```
- [ ] Resend API key set
- [ ] Domain verified in Resend dashboard
- [ ] DKIM/SPF records added to DNS
- [ ] Test email delivered successfully

---

## T-1h: Launch Activation

### 10. Enable SaaS Mode (2 min)
```bash
cd /opt/tiktok-video-factory

# Enable public registration
sed -i 's/^SAAS_MODE=.*/SAAS_MODE=true/' .env

# If Stripe configured, enable:
# sed -i 's/^STRIPE_MODE=.*/STRIPE_MODE=test/' .env

# If Resend configured, enable:
# sed -i 's/^EMAIL_MODE=.*/EMAIL_MODE=resend/' .env

# Restart server
docker compose -f docker-compose.prod.yml up -d server

# Wait for restart
sleep 5

# Verify
curl -s https://ttvideoai.com/api/auth/register -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"launch-test@ttvideoai.com","password":"LaunchTest123!","name":"Launch Test"}'
```
- [ ] SAAS_MODE=true in .env
- [ ] Server restarted successfully
- [ ] Register endpoint returns success (not "SaaS disabled")

### 11. First Admin Creation (5 min)
- [ ] Visit https://ttvideoai.com/register
- [ ] Create account: `admin@ttvideoai.com`
- [ ] Verify email (check server logs for token in mock mode)
- [ ] Login to dashboard
- [ ] Create workspace: "TikTok AI Factory Admin"

### 12. First Workspace Creation (2 min)
- [ ] Workspace created successfully
- [ ] Free plan auto-assigned
- [ ] 50 credits in wallet
- [ ] Credit balance visible in dashboard

---

## T+0: Go-Live

### 13. Go-Live Command
```bash
# Announce launch
# Post to social media, email list, etc.
echo "TikTok AI Factory is now LIVE at https://ttvideoai.com"
```

### 14. First Paid Subscription (30 min after launch)
- [ ] User upgrades from Free → Starter (or higher)
- [ ] Stripe checkout works (if configured)
- [ ] Credits granted upon payment
- [ ] Subscription status shows "active"
- [ ] Invoice generated

### 15. First AI Generation (15 min after first user)
- [ ] User adds a product
- [ ] AI script generated (DeepSeek)
- [ ] Storyboard created
- [ ] Video task submitted (mock or real)
- [ ] Video appears in library

### 16. First Published Video (30 min after first generation)
- [ ] User creates publish job
- [ ] Platform: TikTok
- [ ] Job status transitions: draft → scheduled → published
- [ ] Publishing stats updated

### 17. First Customer Onboarding (continuous)
- [ ] User completes onboarding wizard
- [ ] All 5 steps: Workspace → Provider → Product → Video → Publish
- [ ] User returns to dashboard

---

## T+1h: Post-Launch Monitoring

### 18. System Health (every 15 min for first 2 hours)
```bash
watch -n 900 '
echo "=== Health ===" 
curl -s http://localhost:4000/api/health
echo ""
echo "=== New Users ==="
docker exec tiktok-vf-db psql -U tiktok -d tiktok_video_factory -t -c "SELECT count(*) FROM users WHERE created_at > now() - interval '\''1 hour'\'';"
echo "=== Errors ==="
docker logs tiktok-vf-server --since 15m 2>&1 | grep -c "Error"
echo "=== Disk ==="
df -h / | tail -1
'
```
- [ ] API health: 200
- [ ] New user signups registering
- [ ] Error count <5 per 15 minutes
- [ ] Disk usage stable

### 19. User Monitoring
```sql
-- Run every 30 minutes
SELECT 
  (SELECT count(*) FROM users WHERE created_at > now() - interval '1 hour') as new_users_last_hour,
  (SELECT count(*) FROM workspaces WHERE created_at > now() - interval '1 hour') as new_workspaces,
  (SELECT count(*) FROM credit_transactions WHERE type='consume' AND created_at > now() - interval '1 hour') as operations_last_hour;
```
- [ ] New user count tracked
- [ ] Credit consumption tracked
- [ ] Publishing jobs tracked

### 20. Error Monitoring
```bash
# Continuous error watch
docker logs -f tiktok-vf-server 2>&1 | grep --line-buffered -E "Error|error|FAIL|CRITICAL"
```
- [ ] No CRITICAL errors
- [ ] Any errors investigated immediately

---

## Rollback Procedure (if needed)

### Instant Rollback:
```bash
cd /opt/tiktok-video-factory
sed -i 's/^SAAS_MODE=.*/SAAS_MODE=false/' .env
docker compose -f docker-compose.prod.yml up -d server
# Platform reverts to v1.0.1 behavior in <10 seconds
```

### Full Rollback:
```bash
git checkout v1.0.1
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## Emergency Contacts

| Role | Contact | When to Call |
|------|---------|-------------|
| Stripe Support | dashboard.stripe.com/support | Payment failures |
| Resend Support | resend.com/help | Email delivery issues |
| DeepSeek Support | platform.deepseek.com | LLM API failures |
| Volcengine (Seedance) | console.volcengine.com | Video generation failures |
| Let's Encrypt | letsencrypt.org/contact | SSL expiry |
| Server Provider | Your cloud provider | Infrastructure issues |

---

## Launch Day Sign-Off

| Checkpoint | Time | Signature |
|-----------|------|-----------|
| Pre-launch verification complete | T-24h | ________ |
| External services verified | T-12h | ________ |
| SaaS mode enabled | T-1h | ________ |
| Admin account created | T-1h | ________ |
| First workspace created | T-30m | ________ |
| Go-Live announcement | T+0 | ________ |
| First signup verified | T+15m | ________ |
| First payment processed | T+1h | ________ |
| First AI generation | T+1h | ________ |
| First published video | T+2h | ________ |
| 1-hour health check | T+1h | ________ |
| 4-hour health check | T+4h | ________ |
| 24-hour health check | T+24h | ________ |
| Launch declared STABLE | T+24h | ________ |
