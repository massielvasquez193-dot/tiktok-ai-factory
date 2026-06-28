/**
 * RBAC Service — Phase 3
 *
 * Role-Based Access Control with 5 system roles and granular permissions.
 * Seeds default permissions and per-workspace system roles.
 */

import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

// ── Constants ───────────────────────────────────────────────────────────────

export const SYSTEM_ROLES = ['owner', 'admin', 'manager', 'editor', 'viewer'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

// Extended action set — covers all SaaS operations
export const ACTIONS = [
  'create', 'read', 'update', 'delete', 'export', 'manage',
  'invite', 'update_role', 'remove',
  'cancel', 'download', 'purchase', 'grant',
  'generate', 'schedule', 'configure', 'revoke',
] as const;
export type Action = (typeof ACTIONS)[number];

// ── Permission Definitions ──────────────────────────────────────────────────

interface PermDef {
  resource: string;
  actions: string[];
}

const DEFAULT_PERMISSIONS: PermDef[] = [
  // Workspace
  { resource: 'workspace', actions: ['read', 'update', 'delete'] },
  { resource: 'member', actions: ['read', 'invite', 'update_role', 'remove'] },
  // Billing
  { resource: 'billing', actions: ['read', 'manage'] },
  { resource: 'subscription', actions: ['read', 'create', 'update', 'cancel'] },
  { resource: 'invoice', actions: ['read', 'download'] },
  { resource: 'credit', actions: ['read', 'purchase', 'grant'] },
  // Products
  { resource: 'product', actions: ['create', 'read', 'update', 'delete'] },
  // AI Pipeline
  { resource: 'script', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'storyboard', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'prompt', actions: ['create', 'read', 'update', 'delete'] },
  { resource: 'video', actions: ['read', 'generate', 'download', 'delete'] },
  { resource: 'video_compose', actions: ['create', 'read'] },
  // Research & Knowledge
  { resource: 'research', actions: ['create', 'read', 'delete'] },
  { resource: 'knowledge', actions: ['create', 'read', 'update', 'delete'] },
  // Publishing
  { resource: 'publish', actions: ['create', 'read', 'schedule', 'delete'] },
  // Analytics
  { resource: 'analytics', actions: ['read', 'export'] },
  // Admin
  { resource: 'provider', actions: ['read', 'configure'] },
  { resource: 'api_key', actions: ['create', 'read', 'revoke'] },
];

// ── Role ↔ Permission Mapping ─────────────────────────────────────────────

/**
 * Which actions each role gets for each resource.
 * 'all' = all defined actions for that resource.
 */
const ROLE_PERMISSION_MAP: Record<SystemRole, Record<string, 'all' | string[]>> = {
  owner: {
    // Owner gets everything
    '*': 'all',
  },
  admin: {
    // Admin gets everything EXCEPT workspace.delete and billing.manage
    workspace: ['read', 'update'],
    member: ['read', 'invite', 'update_role', 'remove'],
    billing: ['read', 'manage'],
    subscription: ['read', 'create', 'update', 'cancel'],
    invoice: ['read', 'download'],
    credit: ['read', 'purchase'],
    product: ['create', 'read', 'update', 'delete'],
    script: ['create', 'read', 'update', 'delete'],
    storyboard: ['create', 'read', 'update', 'delete'],
    prompt: ['create', 'read', 'update', 'delete'],
    video: ['read', 'generate', 'download', 'delete'],
    video_compose: ['create', 'read'],
    research: ['create', 'read', 'delete'],
    knowledge: ['create', 'read', 'update', 'delete'],
    publish: ['create', 'read', 'schedule', 'delete'],
    analytics: ['read', 'export'],
    provider: ['read', 'configure'],
    api_key: ['create', 'read', 'revoke'],
  },
  manager: {
    product: ['create', 'read', 'update', 'delete'],
    script: ['create', 'read', 'update', 'delete'],
    storyboard: ['create', 'read', 'update', 'delete'],
    prompt: ['create', 'read', 'update', 'delete'],
    video: ['read', 'generate', 'download', 'delete'],
    video_compose: ['create', 'read'],
    research: ['create', 'read', 'delete'],
    knowledge: ['create', 'read', 'update', 'delete'],
    publish: ['create', 'read', 'schedule', 'delete'],
    analytics: ['read', 'export'],
    provider: ['read', 'configure'],
    api_key: ['create', 'read', 'revoke'],
  },
  editor: {
    product: ['read', 'update'],
    script: ['create', 'read', 'update'],
    storyboard: ['create', 'read', 'update'],
    prompt: ['create', 'read', 'update'],
    video: ['read', 'generate', 'download'],
    video_compose: ['create', 'read'],
    research: ['create', 'read'],
    knowledge: ['create', 'read', 'update'],
    publish: ['create', 'read', 'schedule'],
    analytics: ['read'],
    provider: ['read'],
    api_key: ['read'],
  },
  viewer: {
    product: ['read'],
    script: ['read'],
    storyboard: ['read'],
    prompt: ['read'],
    video: ['read', 'download'],
    video_compose: ['read'],
    research: ['read'],
    knowledge: ['read'],
    analytics: ['read'],
    provider: ['read'],
  },
};

// ── Seed Functions ──────────────────────────────────────────────────────────

/**
 * Seed all default permissions. Idempotent (uses upsert).
 */
export async function seedDefaultPermissions(): Promise<void> {
  for (const def of DEFAULT_PERMISSIONS) {
    for (const action of def.actions) {
      await prisma.permission.upsert({
        where: { resource_action: { resource: def.resource, action } },
        create: { id: uuid(), resource: def.resource, action, description: `${action} ${def.resource}` },
        update: {},
      });
    }
  }
}

/**
 * Seed the 5 system roles for a workspace. Idempotent.
 */
export async function seedSystemRoles(workspaceId: string): Promise<void> {
  for (const roleName of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { workspaceId_name: { workspaceId, name: roleName } },
      create: {
        id: uuid(),
        workspaceId,
        name: roleName,
        isSystem: true,
        description: `${roleName} role — system managed`,
      },
      update: {},
    });
  }
}

/**
 * Assign permissions to a system role based on the role-permission map.
 */
export async function assignRolePermissions(workspaceId: string, roleName: SystemRole): Promise<void> {
  const role = await prisma.role.findUnique({
    where: { workspaceId_name: { workspaceId, name: roleName } },
  });
  if (!role) throw new Error(`Role ${roleName} not found in workspace`);

  const map = ROLE_PERMISSION_MAP[roleName];
  if (!map) throw new Error(`No permission map for role: ${roleName}`);

  // If '*' is present, grant ALL permissions
  if (map['*'] === 'all') {
    const allPerms = await prisma.permission.findMany();
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { id: uuid(), roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
    return;
  }

  // Grant specific permissions
  for (const [resource, actions] of Object.entries(map)) {
    if (actions === 'all' || Array.isArray(actions)) {
      const actionList: string[] = actions === 'all'
        ? ACTIONS as unknown as string[]
        : actions as string[];

      for (const action of actionList) {
        const perm = await prisma.permission.findUnique({
          where: { resource_action: { resource, action } },
        });
        if (perm) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
            create: { id: uuid(), roleId: role.id, permissionId: perm.id },
            update: {},
          });
        }
      }
    }
  }
}

/**
 * Full workspace RBAC bootstrap: seed roles + assign permissions.
 */
export async function bootstrapWorkspaceRBAC(workspaceId: string): Promise<void> {
  await seedSystemRoles(workspaceId);
  for (const role of SYSTEM_ROLES) {
    await assignRolePermissions(workspaceId, role);
  }
}

// ── Permission Check ────────────────────────────────────────────────────────

/**
 * Check if a user has a specific permission in a workspace.
 *
 * Returns true if the user's role has the required (resource, action) permission.
 */
export async function checkPermission(
  userId: string,
  workspaceId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  // 1. Get user's role in workspace
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { id: true, role: true, status: true },
  });

  if (!member || member.status !== 'active') return false;

  // 2. Owners have all permissions (short circuit)
  if (member.role === 'owner') return true;

  // 3. Check role permission
  const roleRecord = await prisma.role.findUnique({
    where: { workspaceId_name: { workspaceId, name: member.role } },
  });

  if (!roleRecord) return false;

  const hasPerm = await prisma.rolePermission.findFirst({
    where: {
      roleId: roleRecord.id,
      permission: { resource, action },
    },
  });

  return !!hasPerm;
}

/**
 * Get all permissions for a user in a workspace as Set<"resource:action">.
 */
export async function getUserPermissions(
  userId: string,
  workspaceId: string,
): Promise<Set<string>> {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!member || member.status !== 'active') return new Set();

  // Owner: return all defined permissions
  if (member.role === 'owner') {
    const allPerms = await prisma.permission.findMany();
    return new Set(allPerms.map((p) => `${p.resource}:${p.action}`));
  }

  const roleRecord = await prisma.role.findUnique({
    where: { workspaceId_name: { workspaceId, name: member.role } },
  });

  if (!roleRecord) return new Set();

  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId: roleRecord.id },
    include: { permission: true },
  });

  return new Set(rolePerms.map((rp) => `${rp.permission.resource}:${rp.permission.action}`));
}
