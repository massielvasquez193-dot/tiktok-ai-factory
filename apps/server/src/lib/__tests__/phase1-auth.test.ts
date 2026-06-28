/**
 * Phase 1 — Authentication Tests
 *
 * Run:  npx tsx apps/server/src/lib/__tests__/phase1-auth.test.ts
 *
 * Requirements:
 *   - DATABASE_URL must point to a live PostgreSQL database
 *   - SAAS_MODE=true (or test auth service directly)
 *   - No real Redis or external APIs needed
 */

import { register, login, verifyToken, logout, getMe, updateMe, changePassword } from '../../services/auth.service';
import { prisma } from '../../lib/prisma';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
  else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label}`); }
}

const TEST_USER = {
  email: `phase1-test-${Date.now()}@test.com`,
  password: 'TestPass123!',
  name: 'Phase 1 Test User',
};

async function main(): Promise<void> {
  console.log('\n═══ Phase 1: Authentication Tests ═══\n');

  // ── 1. Register ──────────────────────────────────────────────────────────

  console.log('── 1. Register ──');

  let result: any;
  try {
    result = await register(TEST_USER.email, TEST_USER.password, TEST_USER.name);
    assert(!!result, '1.1 register returns result');
    assert(!!result.user, '1.2 result has user');
    assert(!!result.token, '1.3 result has token');
    assert(result.user.email === TEST_USER.email, '1.4 user email matches');
    assert(result.user.name === TEST_USER.name, '1.5 user name matches');
    assert(result.user.status === 'active', '1.6 user status is active');
    assert(typeof result.token === 'string' && result.token.length > 20, '1.7 token is valid JWT string');
  } catch (e: any) {
    assert(false, `1.x register failed: ${e.message}`);
  }

  // 1.8 Duplicate email
  try {
    await register(TEST_USER.email, 'OtherPass456!', 'Duplicate');
    assert(false, '1.8 duplicate email should throw');
  } catch (e: any) {
    assert(e.message.includes('already exists'), '1.8 duplicate email rejected');
  }

  // 1.9 Invalid email
  try {
    await register('notanemail', 'Test123!', 'Bad');
    assert(false, '1.9 invalid email should throw');
  } catch (e: any) {
    assert(true, '1.9 invalid email rejected');
  }

  // 1.10 Short password
  try {
    await register('short@test.com', '12345', 'Short');
    assert(false, '1.10 short password should throw');
  } catch (e: any) {
    assert(e.message.includes('at least 6'), '1.10 short password rejected');
  }

  // ── 2. Login ─────────────────────────────────────────────────────────────

  console.log('\n── 2. Login ──');

  let loginResult: any;
  try {
    loginResult = await login(TEST_USER.email, TEST_USER.password);
    assert(!!loginResult, '2.1 login returns result');
    assert(!!loginResult.token, '2.2 login returns token');
    assert(loginResult.user.email === TEST_USER.email, '2.3 login user email matches');
  } catch (e: any) {
    assert(false, `2.x login failed: ${e.message}`);
  }

  // 2.4 Wrong password
  try {
    await login(TEST_USER.email, 'WrongPass!');
    assert(false, '2.4 wrong password should throw');
  } catch (e: any) {
    assert(e.message.includes('Invalid email or password'), '2.4 wrong password rejected');
  }

  // 2.5 Non-existent email
  try {
    await login('noone@test.com', 'Test123!');
    assert(false, '2.5 non-existent email should throw');
  } catch (e: any) {
    assert(e.message.includes('Invalid email or password'), '2.5 non-existent email rejected');
  }

  // ── 3. Token Verification ────────────────────────────────────────────────

  console.log('\n── 3. Token Verification ──');

  const token = loginResult.token;
  try {
    const user = await verifyToken(token);
    assert(!!user, '3.1 valid token returns user');
    assert(user!.email === TEST_USER.email, '3.2 verified user email matches');
  } catch (e: any) {
    assert(false, `3.x verifyToken failed: ${e.message}`);
  }

  // 3.3 Invalid token
  const badUser = await verifyToken('invalid.token.here');
  assert(badUser === null, '3.3 invalid token returns null');

  // ── 4. Get Me ────────────────────────────────────────────────────────────

  console.log('\n── 4. Get Me ──');

  try {
    const me = await getMe(result.user.id);
    assert(!!me, '4.1 getMe returns user');
    assert(me!.email === TEST_USER.email, '4.2 getMe email matches');
  } catch (e: any) {
    assert(false, `4.x getMe failed: ${e.message}`);
  }

  // 4.3 Non-existent user
  const noUser = await getMe('non-existent-id');
  assert(noUser === null, '4.3 non-existent user returns null');

  // ── 5. Update Me ─────────────────────────────────────────────────────────

  console.log('\n── 5. Update Me ──');

  try {
    const updated = await updateMe(result.user.id, { name: 'Updated Name' });
    assert(updated.name === 'Updated Name', '5.1 name updated');

    // Revert
    await updateMe(result.user.id, { name: TEST_USER.name });
    assert(true, '5.3 reverted name back');
  } catch (e: any) {
    assert(false, `5.x updateMe failed: ${e.message}`);
  }

  // ── 6. Change Password ───────────────────────────────────────────────────

  console.log('\n── 6. Change Password ──');

  try {
    await changePassword(result.user.id, TEST_USER.password, 'NewPass456!');
    assert(true, '6.1 password changed');

    // Login with new password
    const relogin = await login(TEST_USER.email, 'NewPass456!');
    assert(!!relogin.token, '6.2 login with new password works');

    // Change back
    await changePassword(result.user.id, 'NewPass456!', TEST_USER.password);
    assert(true, '6.3 password changed back');
  } catch (e: any) {
    assert(false, `6.x changePassword failed: ${e.message}`);
  }

  // ── 7. Logout ────────────────────────────────────────────────────────────

  console.log('\n── 7. Logout ──');

  try {
    await logout(token);
    assert(true, '7.1 logout succeeds');

    // Token should no longer verify (session deleted)
    const afterLogout = await verifyToken(token);
    assert(afterLogout === null, '7.2 token invalidated after logout');
  } catch (e: any) {
    assert(false, `7.x logout failed: ${e.message}`);
  }

  // ── 8. Cleanup ───────────────────────────────────────────────────────────

  console.log('\n── Cleanup ──');

  try {
    await prisma.session.deleteMany({ where: { user: { email: TEST_USER.email } } });
    await prisma.user.delete({ where: { email: TEST_USER.email } });
    assert(true, '8.1 test user cleaned up');
  } catch (e: any) {
    console.log(`  Cleanup note: ${e.message}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  Passed: ${passed}  Failed: ${failed}`);
  console.log(`═══════════════════════════════════════\n`);

  if (failed > 0) process.exit(1);
}

// Set JWT_SECRET for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-phase1-32chars';

main().catch((err) => {
  console.error('\n\x1b[31mFATAL:\x1b[0m', err.message);
  process.exit(1);
});
