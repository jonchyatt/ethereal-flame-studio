/**
 * Project Service - Local-first CRUD for projects
 *
 * Phase M1: Local Canonical Data Model
 */

import { eq, and } from 'drizzle-orm';
import { getDataDb } from '../db';
import { projects, syncLog, type Project, type NewProject } from '../schema';

function now() {
  return new Date().toISOString();
}

export class ProjectService {
  private get db() {
    return getDataDb();
  }

  async getAll(filter?: {
    status?: 'active' | 'on_hold' | 'completed' | 'all';
  }): Promise<Project[]> {
    if (filter?.status && filter.status !== 'all') {
      return this.db
        .select()
        .from(projects)
        .where(eq(projects.status, filter.status))
        .all();
    }
    return this.db.select().from(projects).all();
  }

  async getById(id: number): Promise<Project | undefined> {
    const results = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return results[0];
  }

  async getByNotionId(notionId: string): Promise<Project | undefined> {
    const results = await this.db.select().from(projects).where(eq(projects.notionId, notionId)).limit(1);
    return results[0];
  }

  async create(data: Omit<NewProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const results = await this.db
      .insert(projects)
      .values({ ...data, updatedAt: now() })
      .returning();

    const project = results[0];

    await this.db.insert(syncLog).values({
      domain: 'projects',
      direction: 'local_to_notion',
      localId: project.id,
      notionId: project.notionId,
      action: 'create',
    });

    return project;
  }

  async updateStatus(id: number, status: 'active' | 'on_hold' | 'completed'): Promise<Project | undefined> {
    const results = await this.db
      .update(projects)
      .set({ status, updatedAt: now() })
      .where(eq(projects.id, id))
      .returning();

    const project = results[0];
    if (!project) return undefined;

    await this.db.insert(syncLog).values({
      domain: 'projects',
      direction: 'local_to_notion',
      localId: project.id,
      notionId: project.notionId,
      action: 'update',
    });

    return project;
  }
}

export const projectService = new ProjectService();
