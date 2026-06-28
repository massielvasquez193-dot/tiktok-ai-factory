/**
 * AI Workspace Service — Sprint 5 Phase 1
 * AI Projects, Prompt Templates, Saved Prompts, AI Chat.
 */

import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

// ── AI Projects ────────────────────────────────────────────────────────────

export async function createProject(workspaceId: string, data: { name: string; description?: string; productIds?: string[] }) {
  const p = await prisma.aIProject.create({
    data: {
      id: uuid(), workspaceId, name: data.name,
      description: data.description || '',
      productIds: JSON.stringify(data.productIds || []),
    },
  });
  return { id: p.id, name: p.name, description: p.description, status: p.status, scriptCount: p.scriptCount, videoCount: p.videoCount, createdAt: p.createdAt.toISOString() };
}

export async function listProjects(workspaceId: string, status?: string) {
  const where: any = { workspaceId };
  if (status) where.status = status;
  const projects = await prisma.aIProject.findMany({ where, orderBy: { updatedAt: 'desc' } });
  return projects.map(p => ({ id: p.id, name: p.name, description: p.description, status: p.status, scriptCount: p.scriptCount, videoCount: p.videoCount, productIds: JSON.parse(p.productIds), createdAt: p.createdAt.toISOString() }));
}

export async function getProject(projectId: string) {
  const p = await prisma.aIProject.findUnique({ where: { id: projectId } });
  if (!p) return null;
  return { id: p.id, name: p.name, description: p.description, status: p.status, scriptCount: p.scriptCount, videoCount: p.videoCount, productIds: JSON.parse(p.productIds), createdAt: p.createdAt.toISOString() };
}

export async function updateProject(projectId: string, data: { name?: string; description?: string; status?: string; productIds?: string[] }) {
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status) updateData.status = data.status;
  if (data.productIds) updateData.productIds = JSON.stringify(data.productIds);
  const p = await prisma.aIProject.update({ where: { id: projectId }, data: updateData });
  return { id: p.id, name: p.name, description: p.description, status: p.status, productIds: JSON.parse(p.productIds) };
}

export async function deleteProject(projectId: string) {
  await prisma.aIProject.delete({ where: { id: projectId } });
}

// ── Prompt Templates ────────────────────────────────────────────────────────

export async function createTemplate(workspaceId: string, userId: string, data: { name: string; description?: string; category?: string; content: string; variables?: string[]; language?: string; isPublic?: boolean }) {
  const t = await prisma.promptTemplate.create({
    data: {
      id: uuid(), workspaceId, name: data.name,
      description: data.description || '',
      category: data.category || 'general',
      content: data.content,
      variables: JSON.stringify(data.variables || []),
      language: data.language || 'en',
      isPublic: data.isPublic || false,
      createdBy: userId,
    },
  });
  return { id: t.id, name: t.name, category: t.category, content: t.content, variables: JSON.parse(t.variables), language: t.language, isPublic: t.isPublic, usageCount: t.usageCount };
}

export async function listTemplates(workspaceId: string, options?: { category?: string; isPublic?: boolean }) {
  const where: any = { workspaceId };
  if (options?.category) where.category = options.category;
  if (options?.isPublic !== undefined) where.isPublic = options.isPublic;
  const templates = await prisma.promptTemplate.findMany({ where, orderBy: { usageCount: 'desc' } });
  return templates.map(t => ({ id: t.id, name: t.name, description: t.description, category: t.category, content: t.content, variables: JSON.parse(t.variables), language: t.language, isPublic: t.isPublic, isOfficial: t.isOfficial, usageCount: t.usageCount, createdBy: t.createdBy }));
}

export async function getTemplate(templateId: string) {
  const t = await prisma.promptTemplate.findUnique({ where: { id: templateId } });
  if (!t) return null;
  return { id: t.id, name: t.name, description: t.description, category: t.category, content: t.content, variables: JSON.parse(t.variables), language: t.language, isPublic: t.isPublic, usageCount: t.usageCount, createdBy: t.createdBy };
}

export async function deleteTemplate(templateId: string) {
  await prisma.promptTemplate.delete({ where: { id: templateId } });
}

// ── Saved Prompts ───────────────────────────────────────────────────────────

export async function savePrompt(workspaceId: string, userId: string, data: { name: string; prompt: string; negativePrompt?: string; model?: string; category?: string; tags?: string[] }) {
  const p = await prisma.savedPrompt.create({
    data: {
      id: uuid(), workspaceId, name: data.name,
      prompt: data.prompt, negativePrompt: data.negativePrompt || '',
      model: data.model || 'seedance', category: data.category || 'general',
      tags: (data.tags || []).join(','), createdBy: userId,
    },
  });
  return { id: p.id, name: p.name, prompt: p.prompt, negativePrompt: p.negativePrompt, model: p.model, category: p.category, tags: p.tags.split(',').filter(Boolean), isFavorite: p.isFavorite, usageCount: p.usageCount };
}

export async function listSavedPrompts(workspaceId: string, options?: { category?: string; isFavorite?: boolean; search?: string }) {
  const where: any = { workspaceId };
  if (options?.category) where.category = options.category;
  if (options?.isFavorite) where.isFavorite = true;
  const prompts = await prisma.savedPrompt.findMany({ where, orderBy: { updatedAt: 'desc' } });
  let items = prompts.map(p => ({ id: p.id, name: p.name, prompt: p.prompt, negativePrompt: p.negativePrompt, model: p.model, category: p.category, tags: p.tags.split(',').filter(Boolean), isFavorite: p.isFavorite, usageCount: p.usageCount, createdBy: p.createdBy, createdAt: p.createdAt.toISOString() }));
  if (options?.search) {
    const q = options.search.toLowerCase();
    items = items.filter(p => p.name.toLowerCase().includes(q) || p.prompt.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)));
  }
  return items;
}

export async function toggleFavorite(savedPromptId: string) {
  const p = await prisma.savedPrompt.findUnique({ where: { id: savedPromptId } });
  if (!p) throw new Error('Prompt not found');
  const updated = await prisma.savedPrompt.update({ where: { id: savedPromptId }, data: { isFavorite: !p.isFavorite } });
  return updated.isFavorite;
}

export async function deleteSavedPrompt(savedPromptId: string) {
  await prisma.savedPrompt.delete({ where: { id: savedPromptId } });
}

// ── AI Chat ─────────────────────────────────────────────────────────────────

export async function sendChatMessage(workspaceId: string, userId: string, data: { content: string; model?: string }) {
  const msg = await prisma.aIChatMessage.create({
    data: {
      id: uuid(), workspaceId, userId,
      role: 'user', content: data.content,
      model: data.model || 'deepseek',
    },
  });
  // Simulate assistant response
  const response = await prisma.aIChatMessage.create({
    data: {
      id: uuid(), workspaceId, userId,
      role: 'assistant',
      content: `🤖 [${data.model || 'deepseek'}] I received: "${data.content.slice(0, 200)}${data.content.length > 200 ? '...' : ''}" — Provider ready for real integration.`,
      model: data.model || 'deepseek',
    },
  });
  return {
    userMessage: { id: msg.id, role: msg.role, content: msg.content, createdAt: msg.createdAt.toISOString() },
    assistantMessage: { id: response.id, role: response.role, content: response.content, createdAt: response.createdAt.toISOString() },
  };
}

export async function listChatMessages(workspaceId: string, options?: { limit?: number }) {
  const messages = await prisma.aIChatMessage.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
  });
  return messages.reverse().map(m => ({ id: m.id, userId: m.userId, role: m.role, content: m.content, model: m.model, createdAt: m.createdAt.toISOString() }));
}
