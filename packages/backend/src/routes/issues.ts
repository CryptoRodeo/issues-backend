import { Router, Request, Response } from 'express';
import { checkNamespaceAccess } from '../middleware/checkNamespaceAccess';
import logger from '../utils/logger';
import { IssueState, IssueType, Severity } from '@prisma/client';
import issueService from '../services/issueService';
import { validateCreateIssue, validateUpdateIssue, validateIdParam } from '../middleware/validateIssue';

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
      search,
      limit = 50,
      offset = 0,
    } = req.query;

    const filters = {
      namespace: namespace as string,
      state: state as IssueState,
      severity: severity as Severity,
      issueType: issueType as IssueType,
      resourceType: resourceType as string | undefined,
      resourceName: resourceName as string | undefined,
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    }
    const result = await issueService.findIssues(filters);
    res.json(result);
  } catch (error) {
    logger.error(`Error fetching issues: ${error}`);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Get a single issue by ID
router.get('/:id', validateIdParam, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const issue = await issueService.findIssueById(id);

    if (!issue) {
      return res.status(404).json({ error: `Issue not found` });
    }

    // Verify namespace access again.
    if (issue.namespace !== req.params.namespace && issue.namespace !== req.query.namespace as string) {
      return res.status(403).json({ error: 'Access denied to this namespace' });
    }

    return res.json(issue);
  } catch (error) {
    logger.error(`Error fetching issue: ${error}`);
    res.status(500).json({ error: 'Failed to fetch issue' });
  }
});

router.post('/', validateCreateIssue, async (req: Request, res: Response) => {
  try {
    const newIssue = await issueService.createIssue(req.body);
    res.status(201).json(newIssue);
  } catch (error) {
    logger.error(`Error creating issue: ${error}`);
    res.status(500).json({ error: 'Failed to create issue' })
  }
});


router.put('/:id', validateUpdateIssue, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existingIssue = await issueService.findIssueById(id);

    if (!existingIssue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Verify namespace access (already checked by middleware, but double-check)
    if (existingIssue.namespace !== req.params.namespace && existingIssue.namespace !== req.query.namespace as string) {
      return res.status(403).json({ error: 'Access denied to this namespace' });
    }

    const updatedIssue = await issueService.updateIssue(id, req.body);
    res.json(updatedIssue);
  } catch (error) {
    logger.error(`Error updating issue: ${error}`)
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

router.delete('/:id', validateIdParam, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the issue to verify access
    const existingIssue = await issueService.findIssueById(id);

    if (!existingIssue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Verify namespace access (already checked by middleware, but double-check)
    if (existingIssue.namespace !== req.params.namespace && existingIssue.namespace !== req.query.namespace as string) {
      return res.status(403).json({ error: 'Access denied to this namespace' });
    }

    await issueService.deleteIssue(id);
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting issue: ${error}`);
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

// Add a related issue connection
router.post('/:id/related', validateIdParam, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { relatedId } = req.body;

    if (!relatedId) {
      return res.status(400).json({ error: 'Missing relatedId field' });
    }

    await issueService.addRelatedIssue(id, relatedId);
    res.status(201).json({ message: 'Relationship created' });
  } catch (err: any) {
    logger.error(`Error creating issue relationship: ${err}`);

    if (err.message === 'One or both issues not found') {
      return res.status(404).json({ error: err.message });
    }

    if (err.message === 'Relationship already exists') {
      return res.status(409).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to create issue relationship' });
  }
});

// Remove a related issue connection
router.delete('/:id/related/:relatedId', validateIdParam, async (req: Request, res: Response) => {
  try {
    const { id, relatedId } = req.params;

    await issueService.removeRelatedIssue(id, relatedId);
    res.status(204).send();
  } catch (err: any) {
    logger.error(`Error deleting issue relationship: ${err}`);

    if (err.message === 'Relationship not found') {
      return res.status(404).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to delete issue relationship' });
  }
});


// Resolve an issue (shorthand for setting state to RESOLVED)
router.post('/:id/resolve', validateIdParam, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the issue to verify access
    const existingIssue = await issueService.findIssueById(id);

    if (!existingIssue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Verify namespace access (already checked by middleware, but double-check)
    if (existingIssue.namespace !== req.query.namespace as string) {

      console.log(existingIssue.namespace);
      console.log(req.query.namespace);
      return res.status(403).json({ error: 'Access denied to this namespace' });
    }

    const updatedIssue = await issueService.updateIssue(id, {
      state: 'RESOLVED',
      resolvedAt: new Date()
    });

    res.json(updatedIssue);
  } catch (err) {
    logger.error(`Error resolving issue: ${err}`);
    res.status(500).json({ error: 'Failed to resolve issue' });
  }
});

export default router;
