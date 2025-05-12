import prisma from '../db';
import logger from '../utils/logger';
import { Issue, IssueScope, Link, Severity, IssueType, IssueState } from '@prisma/client';

export interface IssueCreateInput {
  title: string;
  description: string;
  severity: Severity;
  issueType: IssueType;
  state?: IssueState;
  namespace: string;
  scope: {
    resourceType: string;
    resourceName: string;
    resourceNamespace: string;
  };
  links?: {
    title: string;
    url: string;
  }[];
}

export interface IssueUpdateInput {
  title?: string;
  description?: string;
  severity?: Severity;
  issueType?: IssueType;
  state?: IssueState;
  resolvedAt?: Date | null;
  links?: {
    title: string;
    url: string;
  }[];
}

export interface IssueQueryFilters {
  namespace?: string;
  severity?: Severity;
  issueType?: IssueType;
  state?: IssueState;
  resourceType?: string;
  resourceName?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface IssueWithRelations extends Issue {
  scope: IssueScope;
  links: Link[];
  relatedIssues?: Issue[];
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingIssue?: Issue;
}

class IssueService {
  /**
   * Find issues with optional filters
   */
  async findIssues(filters: IssueQueryFilters): Promise<{
    data: IssueWithRelations[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      const {
        namespace,
        severity,
        issueType,
        state,
        resourceType,
        resourceName,
        search,
        limit = 50,
        offset = 0,
      } = filters;

      // Build filter object
      const where: any = {
        namespace: namespace as string,
        ...(issueType ? { issueType } : {}),
        ...(severity ? { severity } : {}),
        ...(state ? { state: state.toUpperCase() } : {}),
        ...(resourceType ? { scope: { resourceType }} : {}),
        ...(resourceName ? { scope: { resourceName }} : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' }}
          ]
        } : {})
      };

      const issues = await prisma.issue.findMany({
        where,
        include: {
          scope: true,
          links: true,
          relatedFrom: {
            include: {
              target: {
                include: {
                  scope: true
                }
              }
            }
          },
          relatedTo: {
            include: {
              source: {
                include: {
                  scope: true
                }
              }
            }
          }
        },
        orderBy: {
          detectedAt: 'desc'
        },
        skip: Number(offset),
        take: Number(limit)
      });

      // Get total count for pagination
      const total = await prisma.issue.count({ where });

      return {
        data: issues as unknown as IssueWithRelations[],
        total,
        limit: Number(limit),
        offset: Number(offset)
      };
    } catch (error) {
      logger.error(`Error in findIssues: ${error}`);
      throw error;
    }
  }

  /**
   * Find a single issue by ID
   */
  async findIssueById(id: string): Promise<IssueWithRelations | null> {
    try {
      const issue = await prisma.issue.findUnique({
        where: { id },
        include: {
          scope: true,
          links: true,
          relatedFrom: {
            include: {
              target: {
                include: {
                  scope: true
                }
              }
            }
          },
          relatedTo: {
            include: {
              source: {
                include: {
                  scope: true
                }
              }
            }
          }
        }
      });

      return issue as unknown as IssueWithRelations;
    } catch (error) {
      logger.error(`Error in findIssueById: ${error}`);
      throw error;
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(data: IssueCreateInput): Promise<IssueWithRelations> {
    try {
      const {
        title,
        description,
        severity,
        issueType,
        state = 'ACTIVE',
        namespace,
        scope,
        links = []
      } = data;

      // Check if we're actually re-creating the same issue
      const { isDuplicate, existingIssue } = await this.checkForDuplicateIssue(data);
      if (isDuplicate && existingIssue) {
        return this.updateIssue(existingIssue.id, data);
      }

      const newIssue = await prisma.issue.create({
        data: {
          title,
          description,
          severity,
          issueType,
          state,
          detectedAt: new Date(),
          namespace,
          scope: {
            create: {
              resourceType: scope.resourceType,
              resourceName: scope.resourceName,
              resourceNamespace: namespace
            }
          },
          links: {
            create: links.map(link => ({
              title: link.title,
              url: link.url
            }))
          }
        },
        include: {
          scope: true,
          links: true
        }
      });

      logger.info(`Created new issue: ${newIssue.id}`);
      return newIssue as IssueWithRelations;
    } catch (error) {
      logger.error(`Error in createIssue: ${error}`);
      throw error;
    }
  }

  /**
   * Update an existing issue
   */
  async updateIssue(id: string, data: IssueUpdateInput): Promise<IssueWithRelations> {
    try {
      const {
        title,
        description,
        severity,
        issueType,
        state,
        resolvedAt,
        links
      } = data;

      // Find the issue to verify it exists
      const existingIssue = await prisma.issue.findUnique({
        where: { id }
      });

      if (!existingIssue) {
        throw new Error(`Issue with ID ${id} not found`);
      }

      // Prepare update data
      const updateData: any = {
        ...( title ? { title} : {}),
        ...(description ? { description } : {}),
        ...(severity ? { severity } : {}),
        ...(issueType ? { issueType } : {}),
        ...(state ? { state } : {}),
        updatedAt: new Date(),
      };

      // Handle state change to RESOLVED
      if (state === 'RESOLVED' && existingIssue.state !== 'RESOLVED') {
        updateData.resolvedAt = new Date();
      } else if (resolvedAt !== undefined) {
        updateData.resolvedAt = resolvedAt;
      }

      // Start a transaction to update the issue and its links if needed
      const result = await prisma.$transaction(async (tx) => {
        // Update the issue
        const updatedIssue = await tx.issue.update({
          where: { id },
          data: updateData,
          include: {
            scope: true,
            links: true
          }
        });

        // Handle links updates if provided
        if (links !== undefined) {
          const issueId = id;

          // Delete old links
          await tx.link.deleteMany({
            where: {
              issueId
            }
          });

          // Create new links
          for (const link of links) {
            await tx.link.create({
              data: {
                title: link.title,
                url: link.url,
                issueId
              }
            });
          }
        }

        return updatedIssue;
      });

      logger.info(`Updated existing issue: ${id}`);
      return result as IssueWithRelations;
    } catch (error) {
      logger.error(`Error updating existing issue: ${error}`);
      throw error;
    }
  }

  /**
   * Delete an issue
   */
  async deleteIssue(id: string): Promise<void> {
    try {
      // Find the issue to get the scope ID
      const issue = await prisma.issue.findUnique({
        where: { id },
        select: { scopeId: true }
      });

      if (!issue) {
        throw new Error(`Issue with ID ${id} not found`);
      }

      // Delete in a transaction to maintain integrity
      await prisma.$transaction([
        // Delete related issues links
        prisma.relatedIssue.deleteMany({
          where: {
            OR: [
              { sourceId: id },
              { targetId: id }
            ]
          }
        }),
        // Delete links
        prisma.link.deleteMany({
          where: { issueId: id }
        }),
        // Delete the issue
        prisma.issue.delete({
          where: { id }
        }),
        // Delete the scope
        prisma.issueScope.delete({
          where: { id: issue.scopeId }
        })
      ]);

      logger.info(`Deleted issue: ${id}`);
    } catch (error) {
      logger.error(`Error in deleteIssue: ${error}`);
      throw error;
    }
  }

  /**
   * Connect two issues as related
   */
  async addRelatedIssue(sourceId: string, targetId: string): Promise<void> {
    try {
      // Check if both issues exist
      const [sourceExists, targetExists] = await Promise.all([
        prisma.issue.findUnique({ where: { id: sourceId } }),
        prisma.issue.findUnique({ where: { id: targetId } })
      ]);

      if (!sourceExists || !targetExists) {
        throw new Error('One or both issues not found');
      }

      // Check if relationship already exists
      const existingRelation = await prisma.relatedIssue.findFirst({
        where: {
          OR: [
            // Check source to target
            { sourceId, targetId },
            // Check target to source
            { sourceId: targetId, targetId: sourceId }
          ]
        }
      });

      if (existingRelation) {
        throw new Error('Relationship already exists');
      }

      // Create relationship
      await prisma.relatedIssue.create({
        data: {
          sourceId,
          targetId
        }
      });

      logger.info(`Added related issue: ${sourceId} -> ${targetId}`);
    } catch (error) {
      logger.error(`Error in addRelatedIssue: ${error}`);
      throw error;
    }
  }

  /**
   * Remove relationship between issues
   */
  async removeRelatedIssue(sourceId: string, targetId: string): Promise<void> {
    try {
      // Find the relationship
      const relation = await prisma.relatedIssue.findFirst({
        where: {
          OR: [
            // Check source to target
            { sourceId, targetId },
            // Check target to source
            { sourceId: targetId, targetId: sourceId }
          ]
        }
      });

      if (!relation) {
        throw new Error('Relationship not found');
      }

      // Delete the relationship
      await prisma.relatedIssue.delete({
        where: { id: relation.id }
      });

      logger.info(`Removed related issue: ${sourceId} <-> ${targetId}`);
    } catch (error) {
      logger.error(`Error in removeRelatedIssue: ${error}`);
      throw error;
    }
  }

  async checkForDuplicateIssue(input: IssueCreateInput): Promise<DuplicateCheckResult> {
    try {
      // Check for active issues with the same scope and type
      const existingIssue = await prisma.issue.findFirst({
        where: {
          AND: [
            { namespace: input.namespace },
            { issueType: input.issueType },
            { state: 'ACTIVE' as IssueState },
            {
              scope: {
                resourceType: input.scope.resourceType,
                resourceName: input.scope.resourceName,
                resourceNamespace: input.scope.resourceNamespace,
              }
            }
          ]
        },
        include: {
          scope: true,
          links: true
        }
      });

      if (existingIssue) {
        logger.info(`Found duplicate issue: ${existingIssue.id}`);
        return { isDuplicate: true, existingIssue };
      }

      return { isDuplicate: false };
    } catch (error) {
      logger.error(`Error checking for duplicate issues: ${error}`);
      throw error;
    }
  }

  async resolveIssuesByScope(
    resourceType: string,
    resourceName: string,
    namespace: string
  ): Promise<number> {
    try {
      const issues = await prisma.issue.findMany({
        where: {
          state: 'ACTIVE',
          namespace,
          scope: {
            resourceType,
            resourceName,
            resourceNamespace: namespace
          }
        }
      });

      if (issues.length === 0) {
        return 0;
      }

      // Update all found issues to RESOLVED
      const now = new Date();
      await prisma.issue.updateMany({
        where: {
          id: {
            in: issues.map(issue => issue.id)
          }
        },
        data: {
          state: 'RESOLVED',
          resolvedAt: now
        }
      });

      logger.info(`Resolved ${issues.length} issues for ${resourceType}/${resourceName}`)

      return issues.length;
    } catch (error) {
      logger.error(`Error resolving issues: ${error}`)
      throw error;
    }
  }
}


// Export a singleton instance
const issueService = new IssueService();
export default issueService;
