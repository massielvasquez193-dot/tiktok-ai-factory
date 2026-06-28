/**
 * Workspace Service — Phase 2
 *
 * Handles workspace CRUD, member management, and invitation flow.
 * Each new workspace gets an Owner member (the creator).
 */

import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

// ── Types ───────────────────────────────────────────────────────────────────

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
  role: string;
  memberCount: number;
  createdAt: string;
}

export interface MemberInfo {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  status: string;
  joinedAt: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// ── Workspace CRUD ──────────────────────────────────────────────────────────

/**
 * Create a new workspace. The creating user becomes the Owner.
 */
export async function createWorkspace(
  userId: string,
  name: string,
  slug?: string,
): Promise<WorkspaceInfo> {
  if (!name || !name.trim()) throw new Error('Workspace name is required');

  const finalSlug = slug || toSlug(name);
  const workspaceId = uuid();

  // Check slug uniqueness
  const existing = await prisma.workspace.findUnique({ where: { slug: finalSlug } });
  if (existing) throw new Error(`Workspace slug "${finalSlug}" is already taken`);

  const workspace = await prisma.workspace.create({
    data: { id: workspaceId, name: name.trim(), slug: finalSlug },
  });

  // Creator becomes Owner
  await prisma.workspaceMember.create({
    data: {
      id: uuid(),
      userId,
      workspaceId: workspace.id,
      role: 'owner',
      status: 'active',
    },
  });

  // Bootstrap RBAC (seed roles + permissions)
  const { bootstrapWorkspaceRBAC } = await import('./rbac.service');
  await bootstrapWorkspaceRBAC(workspace.id);

  // Assign Free plan by default (also initializes credits)
  const { assignPlan } = await import('./subscription.service');
  await assignPlan(workspace.id, 'free');

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    logoUrl: workspace.logoUrl,
    status: workspace.status,
    role: 'owner',
    memberCount: 1,
    createdAt: workspace.createdAt.toISOString(),
  };
}

/**
 * List all workspaces a user belongs to.
 */
export async function getUserWorkspaces(userId: string): Promise<WorkspaceInfo[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, status: 'active' },
    include: {
      workspace: {
        include: {
          _count: { select: { members: { where: { status: 'active' } } } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    logoUrl: m.workspace.logoUrl,
    status: m.workspace.status,
    role: m.role,
    memberCount: m.workspace._count.members,
    createdAt: m.workspace.createdAt.toISOString(),
  }));
}

/**
 * Get a single workspace by ID. Throws if not found.
 */
export async function getWorkspace(workspaceId: string, userId?: string): Promise<WorkspaceInfo | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      _count: { select: { members: { where: { status: 'active' } } } },
    },
  }) as any;

  if (!ws || ws.status === 'deleted') return null;

  let role = 'viewer';
  if (userId) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (member) role = member.role;
  }

  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    logoUrl: ws.logoUrl,
    status: ws.status,
    role,
    memberCount: ws._count.members,
    createdAt: ws.createdAt.toISOString(),
  };
}

/**
 * Update workspace settings.
 */
export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; slug?: string; logoUrl?: string; settings?: Record<string, unknown> },
): Promise<WorkspaceInfo> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
  if (data.settings !== undefined) updateData.settings = data.settings;

  const ws = await prisma.workspace.update({
    where: { id: workspaceId },
    data: updateData as any,
    include: { _count: { select: { members: { where: { status: 'active' } } } } },
  }) as any;

  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    logoUrl: ws.logoUrl as string | null,
    status: ws.status,
    role: 'owner',
    memberCount: (ws as any)._count?.members ?? 1,
    createdAt: ws.createdAt.toISOString(),
  };
}

/**
 * Soft-delete a workspace.
 */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { status: 'deleted' },
  });
}

// ── Members ─────────────────────────────────────────────────────────────────

/**
 * List workspace members.
 */
export async function getMembers(workspaceId: string): Promise<MemberInfo[]> {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId, status: { in: ['active', 'invited'] } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    userName: m.user.name,
    userEmail: m.user.email,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt.toISOString(),
  }));
}

/**
 * Invite a member by email. Creates a pending membership.
 */
export async function inviteMember(
  workspaceId: string,
  email: string,
  role: string = 'editor',
): Promise<MemberInfo> {
  if (!email || !email.includes('@')) throw new Error('Valid email is required');

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) throw new Error('User not found. They must register first.');

  // Check not already a member
  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });
  if (existing && existing.status !== 'suspended') {
    throw new Error('User is already a member of this workspace');
  }

  const member = await prisma.workspaceMember.create({
    data: {
      id: uuid(),
      userId: user.id,
      workspaceId,
      role,
      status: 'active', // Auto-accept for now; invite flow comes in v1.2
    },
  });

  return {
    id: member.id,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt.toISOString(),
  };
}

/**
 * Update a member's role.
 */
export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  role: string,
): Promise<MemberInfo> {
  const validRoles = ['owner', 'admin', 'manager', 'editor', 'viewer'];
  if (!validRoles.includes(role)) throw new Error(`Invalid role: ${role}`);

  const member = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Owner cannot be demoted
  const currentOwner = await prisma.workspaceMember.findFirst({
    where: { workspaceId, role: 'owner' },
  });

  if (member.role === 'owner' && currentOwner && currentOwner.id !== member.id) {
    // Transferring ownership
    await prisma.workspaceMember.update({
      where: { id: currentOwner.id },
      data: { role: 'admin' },
    });
  }

  return {
    id: member.id,
    userId: member.user.id,
    userName: member.user.name,
    userEmail: member.user.email,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt.toISOString(),
  };
}

/**
 * Remove a member from the workspace. Cannot remove the last owner.
 */
export async function removeMember(workspaceId: string, memberId: string): Promise<void> {
  const member = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
  if (!member) throw new Error('Member not found');

  if (member.role === 'owner') {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: 'owner', status: 'active' },
    });
    if (ownerCount <= 1) {
      throw new Error('Cannot remove the last owner. Transfer ownership first.');
    }
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } });
}
