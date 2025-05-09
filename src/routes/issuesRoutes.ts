import { Router, Request, Response } from 'express';
import prisma from '../db';
import { checkNamespaceAccess } from '../middleware/checkNamespaceAccess';
import logger from '../utils/logger';
import { IssueState, IssueType, Severity } from '@prisma/client';

const router = Router();

// Apply namespace check middleware to all routes
router.use(checkNamespaceAccess);

// Get all issues with filtering options
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      namespace,
      state,
      severity,
      issueType,
      resourceType,
      resourceName,
      limit = 20,
      offset = 0,
    } = req.query;

    // Build the filter object based on query params
    const filter: any = {};

    if (namespace) filter.namespace = namespace;
    if (state) filter.state = state;
    if (severity) filter.severity = severity;
    if (issueType) filter.issueType = issueType;

    // Include scoep filters if provided
    const scopeFilter: any = {};
    if (resourceType) scopeFilter.resourceType = resourceType;
    if (resourceName) scopeFilter.resourceName = resourceName;

    const issues = await prisma.issue.findMany({
      where: {
        ...filter,
        scope: Object.keys(scopeFilter).length > 0 ? {
          is: scopeFilter
        } : undefined,
      },
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
        }
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: {
        detectedAt: 'desc'
      }
    });

    res.json(issues)
  } catch (error) {
    logger.error(`Error fetching issues: ${error}`);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Get a single issue by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const issue = await prisma.issues.findUnique({
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

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    if (issue.namespace !== req.params.namespace) {
      return res.status(403).json({ error: 'Access denied to this namespace' });
    }
    return res.json(issue);
  } catch (error) {
    logger.error(`Error fetching issue: ${error}`);
    res.status(500).json({ error: 'Failed to fetch issue' });
  }
});

router.get('/grouped', async (req: Request, res: Response) => {
  try {
    const { namespace } = req.query;

    if (!namespace) {
      return res.status(400).json({ error: 'Namespace paramter is required' });
    }

    const primaryIssues = await prisma.issue.findMany({
      where: {
        namespace: namespace as string,
        relatedFrom: {
          some: {} // Has at least one related issue
        }
      },
      include: {
        scope: true,
        links: true,
        relatedFrom: {
          include: {
            target: {
              include: {
                scope: true,
                links: true
              }
            }
          }
        }
      }
    });

    const relatedIssueIds = primaryIssues.flatMap(issue =>
      issue.relatedFrom.map(relation => relation.target.id)
    );

    const standaloneIssues = await prisma.issue.findMany({
      where: {
        namespace: namespace as string,
        id: {
          notIn: [...relatedIssueIds, ...primaryIssues.map(issue => issue.id)]
        }
      },
      include: {
        scope: true,
        links: true,
      }
    });

    // Combine the results
    const result = {
      groupedIssues: primaryIssues,
      standaloneIssues
    };

    res.json(result);
  } catch (error) {
    logger.error(`Error fetching grouped issues: ${error}`);
    res.status(500).json({ error: 'Failed to fetch grouped issues' });
  }
});

router.get('/by-scope/:scopeType', async (req: Request, res: Response) => {
  try {
    const { scopeType } = req.params;
    const { namespace } = req.query;

    if (!namespace) {
      return res.status(400).json({ error: 'Namespace parameter is required' });
    }

    const issues = await prisma.issue.findMany({
      where: {
        namespace: namespace as string,
        scope: {
          resourceType: scopeType
        }
      },
      include: {
        scope: true,
        links: true
      },
      orderBy: {
        detectedAt: 'desc'
      }
    });

    res.json(issues);
  } catch (error) {
    logger.error(`Error fetching issues by scope: ${error}`);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { namespace } = req.query;

    if (!namespace) {
      return res.status(400).json({ error: 'Namespace parameter is required' });
    }

    const totalIssues = await prisma.issue.count({
      where: {
        namespace: namespace as string
      }
    });

    const activeCriticalIssues = await prisma.issue.count({
      where: {
        namespace: namespace as string,
        state: 'ACTIVE',
        severity: 'critical'
      }
    });

    const issuesByType = await prisma.$queryRaw`
      SELECT "issueType", COUNT(*) as count
      FROM "Issue"
      WHERE "namespace" = ${namespace as string}
      GROUP BY "issueType"
    `;

    const issuesBySeverity = await prisma.$queryRaw`
      SELECT "severity", COUNT(*) as count
      FROM "Issue"
      WHERE "namespace" = ${namespace as string}
      GROUP BY "severity"
    `;

    res.json({
      totalIssues,
      activeCriticalIssues,
      issuesByType,
      issuesBySeverity
    });
  } catch (error) {
    logger.error(`Error fetching issue statistics: ${error}`);
    res.status(500).json({ error: `Failed to fetch issue statistics` });
  }
});

export default router;
