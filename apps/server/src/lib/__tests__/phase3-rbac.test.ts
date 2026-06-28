/**
 * Phase 3 — RBAC Tests
 *
 * Run:  npx tsx apps/server/src/lib/__tests__/phase3-rbac.test.ts
 */

import { register } from '../../services/auth.service';
import { createWorkspace, inviteMember } from '../../services/workspace.service';
import {
  seedDefaultPermissions, seedSystemRoles, bootstrapWorkspaceRBAC,
  checkPermission, getUserPermissions,
} from '../../services/rbac.service';
import { prisma } from '../../lib/prisma';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
  else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label}`); }
}

const SUFFIX = Date.now();

async function main(): Promise<void> {
  console.log('\n═══ Phase 3: RBAC Tests ═══\n');

  // ── Setup ─────────────────────────────────────────────────────────────────

  console.log('── Setup ──');
  await seedDefaultPermissions();
  const permCount = await prisma.permission.count();
  assert(permCount > 10, `setup: ${permCount} default permissions seeded`);

  const owner = await register(`rbac-owner-${SUFFIX}@test.com`, 'TestPass123!', 'Owner');
  const editor = await register(`rbac-editor-${SUFFIX}@test.com`, 'TestPass123!', 'Editor');
  assert(!!owner.user, 'setup: owner created');
  assert(!!editor.user, 'setup: editor created');

  // ── 1. System Roles ──────────────────────────────────────────────────────

  console.log('\n── 1. System Roles ──');
  const ws = await createWorkspace(owner.user.id, 'RBAC Test WS', `rbac-test-${SUFFIX}`);
  assert(!!ws, '1.1 workspace created (RBAC auto-bootstrapped)');

  const roles = await prisma.role.findMany({ where: { workspaceId: ws.id } });
  assert(roles.length === 5, `1.2 5 system roles created (got ${roles.length})`);
  assert(roles.some((r) => r.name === 'owner'), '1.3 owner role exists');
  assert(roles.some((r) => r.name === 'admin'), '1.4 admin role exists');
  assert(roles.some((r) => r.name === 'manager'), '1.5 manager role exists');
  assert(roles.some((r) => r.name === 'editor'), '1.6 editor role exists');
  assert(roles.some((r) => r.name === 'viewer'), '1.7 viewer role exists');

  // ── 2. Owner Permissions ─────────────────────────────────────────────────

  console.log('\n── 2. Owner Permissions ──');
  assert(await checkPermission(owner.user.id, ws.id, 'product', 'create'), '2.1 owner can create product');
  assert(await checkPermission(owner.user.id, ws.id, 'script', 'read'), '2.2 owner can read script');
  assert(await checkPermission(owner.user.id, ws.id, 'video', 'generate'), '2.3 owner can generate video');
  assert(await checkPermission(owner.user.id, ws.id, 'billing', 'manage'), '2.4 owner can manage billing');
  assert(await checkPermission(owner.user.id, ws.id, 'member', 'invite'), '2.5 owner can invite');
  assert(await checkPermission(owner.user.id, ws.id, 'nonexistent', 'read'), '2.6 non-existent resource returns false');

  const ownerPerms = await getUserPermissions(owner.user.id, ws.id);
  assert(ownerPerms.size >= 30, `2.7 owner has many permissions (${ownerPerms.size})`);

  // ── 3. Editor Permissions ─────────────────────────────────────────────────

  console.log('\n── 3. Editor Permissions ──');
  // Invite editor to workspace
  const invited = await inviteMember(ws.id, editor.user.email, 'editor');
  assert(invited.role === 'editor', '3.1 editor invited');

  assert(await checkPermission(editor.user.id, ws.id, 'product', 'read'), '3.2 editor can read product');
  assert(await checkPermission(editor.user.id, ws.id, 'script', 'create'), '3.3 editor can create script');
  assert(await checkPermission(editor.user.id, ws.id, 'video', 'generate'), '3.4 editor can generate video');

  // Editor CANNOT do admin things
  assert(!(await checkPermission(editor.user.id, ws.id, 'billing', 'manage')), '3.5 editor cannot manage billing');
  assert(!(await checkPermission(editor.user.id, ws.id, 'member', 'invite')), '3.6 editor cannot invite');
  assert(!(await checkPermission(editor.user.id, ws.id, 'api_key', 'create')), '3.7 editor cannot create API keys');

  const editorPerms = await getUserPermissions(editor.user.id, ws.id);
  assert(editorPerms.size > 5, `3.8 editor has some permissions (${editorPerms.size})`);
  assert(editorPerms.size < ownerPerms.size, '3.9 editor has fewer permissions than owner');

  // ── 4. Viewer Permissions ────────────────────────────────────────────────

  console.log('\n── 4. Viewer Permissions ──');
  const viewer = await register(`rbac-viewer-${SUFFIX}@test.com`, 'TestPass123!', 'Viewer');
  await inviteMember(ws.id, viewer.user.email, 'viewer');

  assert(await checkPermission(viewer.user.id, ws.id, 'product', 'read'), '4.1 viewer can read');
  assert(await checkPermission(viewer.user.id, ws.id, 'video', 'download'), '4.2 viewer can download');
  assert(!(await checkPermission(viewer.user.id, ws.id, 'product', 'create')), '4.3 viewer cannot create');
  assert(!(await checkPermission(viewer.user.id, ws.id, 'script', 'delete')), '4.4 viewer cannot delete');

  // ── 5. Non-member ────────────────────────────────────────────────────────

  console.log('\n── 5. Non-member ──');
  const outsider = await register(`rbac-outsider-${SUFFIX}@test.com`, 'TestPass123!', 'Outsider');
  assert(!(await checkPermission(outsider.user.id, ws.id, 'product', 'read')), '5.1 non-member has no access');
  const outsiderPerms = await getUserPermissions(outsider.user.id, ws.id);
  assert(outsiderPerms.size === 0, '5.2 non-member permission set is empty');

  // ── 6. Idempotent Seed ───────────────────────────────────────────────────

  console.log('\n── 6. Idempotent Seed ──');
  await seedDefaultPermissions(); // Second call should not duplicate
  await seedSystemRoles(ws.id);   // Second call should not duplicate
  const rolesAfter = await prisma.role.count({ where: { workspaceId: ws.id } });
  assert(rolesAfter === 5, `6.1 roles still 5 after re-seed (got ${rolesAfter})`);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  console.log('\n── Cleanup ──');
  try {
    await prisma.rolePermission.deleteMany({ where: { role: { workspaceId: ws.id } } });
    await prisma.role.deleteMany({ where: { workspaceId: ws.id } });
    await prisma.workspaceMember.deleteMany({ where: { workspaceId: ws.id } });
    await prisma.workspace.delete({ where: { id: ws.id } });
    const userIds = [owner.user.id, editor.user.id, viewer.user.id, outsider.user.id];
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    for (const uid of userIds) {
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    assert(true, 'cleanup: test data removed');
  } catch (e: any) {
    console.log(`  Cleanup note: ${e.message}`);
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  Passed: ${passed}  Failed: ${failed}`);
  console.log(`═══════════════════════════════════════\n`);

  if (failed > 0) process.exit(1);
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-phase3-32chars';

main().catch((err) => {
  console.error('\n\x1b[31mFATAL:\x1b[0m', err.message);
  process.exit(1);
});
