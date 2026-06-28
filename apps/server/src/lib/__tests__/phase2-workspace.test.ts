/**
 * Phase 2 — Workspace Tests
 *
 * Run:  npx tsx apps/server/src/lib/__tests__/phase2-workspace.test.ts
 */

import * as wsService from '../../services/workspace.service';
import { register, login } from '../../services/auth.service';
import { prisma } from '../../lib/prisma';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
  else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label}`); }
}

const SUFFIX = Date.now();

async function main(): Promise<void> {
  console.log('\n═══ Phase 2: Workspace Tests ═══\n');

  // ── Setup: create two test users ──────────────────────────────────────────

  console.log('── Setup ──');
  const owner = await register(`ws-owner-${SUFFIX}@test.com`, 'TestPass123!', 'Owner User');
  const member = await register(`ws-member-${SUFFIX}@test.com`, 'TestPass123!', 'Member User');
  assert(!!owner.user, 'setup: owner created');
  assert(!!member.user, 'setup: member created');

  // ── 1. Create Workspace ───────────────────────────────────────────────────

  console.log('\n── 1. Create Workspace ──');
  let ws: any;
  try {
    ws = await wsService.createWorkspace(owner.user.id, 'Test Workspace');
    assert(!!ws, '1.1 workspace created');
    assert(ws.name === 'Test Workspace', '1.2 workspace name matches');
    assert(ws.role === 'owner', '1.3 creator is owner');
    assert(ws.memberCount === 1, '1.4 member count is 1');
    assert(!!ws.slug, '1.5 slug auto-generated');
  } catch (e: any) {
    assert(false, `1.x createWorkspace: ${e.message}`);
  }

  // 1.6 Duplicate slug
  try {
    await wsService.createWorkspace(owner.user.id, 'Duplicate', ws.slug);
    assert(false, '1.6 duplicate slug should throw');
  } catch (e: any) {
    assert(e.message.includes('taken'), '1.6 duplicate slug rejected');
  }

  // ── 2. Get Workspace ──────────────────────────────────────────────────────

  console.log('\n── 2. Get Workspace ──');
  try {
    const found = await wsService.getWorkspace(ws.id, owner.user.id);
    assert(!!found, '2.1 workspace found');
    assert(found!.name === 'Test Workspace', '2.2 name matches');
    assert(found!.role === 'owner', '2.3 role correctly identified');
  } catch (e: any) {
    assert(false, `2.x getWorkspace: ${e.message}`);
  }

  // 2.4 Non-existent
  const notFound = await wsService.getWorkspace('nonexistent-id');
  assert(notFound === null, '2.4 non-existent workspace returns null');

  // ── 3. List User Workspaces ───────────────────────────────────────────────

  console.log('\n── 3. List Workspaces ──');
  try {
    const list = await wsService.getUserWorkspaces(owner.user.id);
    assert(list.length >= 1, '3.1 owner has workspaces');
    assert(list.some((w) => w.id === ws.id), '3.2 created workspace in list');

    // Member should have 0 workspaces (not invited yet)
    const memberList = await wsService.getUserWorkspaces(member.user.id);
    assert(memberList.length === 0, '3.3 member has no workspaces yet');
  } catch (e: any) {
    assert(false, `3.x getUserWorkspaces: ${e.message}`);
  }

  // ── 4. Invite Member ──────────────────────────────────────────────────────

  console.log('\n── 4. Invite Member ──');
  let invitedMember: any;
  try {
    invitedMember = await wsService.inviteMember(ws.id, member.user.email, 'editor');
    assert(!!invitedMember, '4.1 member invited');
    assert(invitedMember.role === 'editor', '4.2 member role is editor');
    assert(invitedMember.userName === 'Member User', '4.3 member name correct');
    assert(invitedMember.status === 'active', '4.4 member status is active');
  } catch (e: any) {
    assert(false, `4.x inviteMember: ${e.message}`);
  }

  // 4.5 Duplicate invite
  try {
    await wsService.inviteMember(ws.id, member.user.email);
    assert(false, '4.5 duplicate invite should throw');
  } catch (e: any) {
    assert(e.message.includes('already a member'), '4.5 duplicate invite rejected');
  }

  // ── 5. List Members ───────────────────────────────────────────────────────

  console.log('\n── 5. List Members ──');
  try {
    const members = await wsService.getMembers(ws.id);
    assert(members.length === 2, '5.1 two members found');
    assert(members.some((m) => m.role === 'owner'), '5.2 owner in list');
    assert(members.some((m) => m.role === 'editor'), '5.3 editor in list');
  } catch (e: any) {
    assert(false, `5.x getMembers: ${e.message}`);
  }

  // ── 6. Update Member Role ─────────────────────────────────────────────────

  console.log('\n── 6. Update Member Role ──');
  try {
    const updated = await wsService.updateMemberRole(ws.id, invitedMember.id, 'admin');
    assert(updated.role === 'admin', '6.1 role updated to admin');
  } catch (e: any) {
    assert(false, `6.x updateMemberRole: ${e.message}`);
  }

  // ── 7. Remove Member ──────────────────────────────────────────────────────

  console.log('\n── 7. Remove Member ──');
  try {
    await wsService.removeMember(ws.id, invitedMember.id);
    assert(true, '7.1 member removed');
    const after = await wsService.getMembers(ws.id);
    assert(after.length === 1, '7.2 member count reduced to 1');
  } catch (e: any) {
    assert(false, `7.x removeMember: ${e.message}`);
  }

  // 7.3 Cannot remove last owner
  try {
    const ownerMembers = await wsService.getMembers(ws.id);
    const ownerMember = ownerMembers[0];
    await wsService.removeMember(ws.id, ownerMember.id);
    assert(false, '7.3 should not allow removing last owner');
  } catch (e: any) {
    assert(e.message.includes('last owner'), '7.3 last owner removal rejected');
  }

  // ── 8. Update Workspace ───────────────────────────────────────────────────

  console.log('\n── 8. Update Workspace ──');
  try {
    const updated = await wsService.updateWorkspace(ws.id, { name: 'Updated Name', slug: `updated-${SUFFIX}` });
    assert(updated.name === 'Updated Name', '8.1 name updated');
    assert(updated.slug === `updated-${SUFFIX}`, '8.2 slug updated');
  } catch (e: any) {
    assert(false, `8.x updateWorkspace: ${e.message}`);
  }

  // ── 9. Delete Workspace ───────────────────────────────────────────────────

  console.log('\n── 9. Delete Workspace ──');
  try {
    await wsService.deleteWorkspace(ws.id);
    assert(true, '9.1 workspace soft-deleted');
    const after = await wsService.getWorkspace(ws.id, owner.user.id);
    assert(after === null, '9.2 workspace not returned after deletion');
  } catch (e: any) {
    assert(false, `9.x deleteWorkspace: ${e.message}`);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  console.log('\n── Cleanup ──');
  try {
    await prisma.workspaceMember.deleteMany({ where: { workspaceId: ws.id } });
    await prisma.workspace.delete({ where: { id: ws.id } });
    await prisma.session.deleteMany({ where: { userId: { in: [owner.user.id, member.user.id] } } });
    await prisma.user.delete({ where: { id: member.user.id } });
    await prisma.user.delete({ where: { id: owner.user.id } });
    assert(true, 'cleanup: test data removed');
  } catch (e: any) {
    console.log(`  Cleanup note: ${e.message}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  Passed: ${passed}  Failed: ${failed}`);
  console.log(`═══════════════════════════════════════\n`);

  if (failed > 0) process.exit(1);
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-phase2-32chars';

main().catch((err) => {
  console.error('\n\x1b[31mFATAL:\x1b[0m', err.message);
  process.exit(1);
});
