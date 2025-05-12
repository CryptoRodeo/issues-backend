import express, { Request, Response } from 'express';
import issueService, { IssueWithRelations } from '../services/issueService';
import logger from '../utils/logger';
import { IssueType, Severity } from '@prisma/client';
import { checkNamespaceAccess } from '../middleware/checkNamespaceAccess';

const router = express.Router();

// Apply namespace check to all routes
router.use(checkNamespaceAccess);

// Pipeline failures
router.post('/pipeline-failure', async(req: Request, res: Response) => {
  try {
    const {
      pipelineName,
      namespace,
      failureReason,
      runId,
      logsUrl
    } = req.body;

    if (!pipelineName || !namespace || !failureReason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format issue data
    const issueData = {
      title: `Pipeline run failed: ${pipelineName}`,
      description: `The pipeline run ${runId} failed with reason: ${failureReason}`,
      severity: 'major' as Severity,
      issueType: 'pipeline' as IssueType,
      namespace,
      scope: {
        resourceType: 'pipelinerun',
        resourceName: pipelineName,
        resourceNamespace: namespace
      },
      links: [
        {
          title: 'Pipeline Run Logs',
          // TODO: Look into having some default PR log id.
          url: logsUrl || `https://konflux.dev/logs/pipelinerun/${runId}`
        }
      ]
    };

    const { isDuplicate, existingIssue } = await issueService.checkForDuplicateIssue(issueData);
    let issue: IssueWithRelations;
    if ( isDuplicate && existingIssue ) {
      issue = await issueService.updateIssue(existingIssue.id, issueData);
      logger.info(`Updating existing pipeline issue: ${existingIssue.id}`)
    } else {
      issue = await issueService.createIssue(issueData);
      logger.info(`Created new pipeline issue: $.id}`)
    }
    return res.status(201).json({ status: 'success', issue})
  } catch (error) {
    res.status(500).json({ error: `Failed to process webhook`})
  }
});

// Webhook for successful pipeline runs (to resolve issues)
router.post('/pipeline-success', async (req: Request, res: Response) => {
  console.log("Hit it");
  try {
    const { pipelineName, namespace } = req.body;

    if (!pipelineName || !namespace) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Resolve any active issues for this pipeline
    const resolved = await issueService.resolveIssuesByScope('pipelinerun', pipelineName, namespace);
    res.json({
      status: 'success',
      message: `Resolved ${resolved} issues for pipeline ${pipelineName}`
    });
  } catch (error) {
    logger.error(`Webhook error: ${error}`);
    res.status(500).json({ error: `Failed to process webhook` })
  }
});

export default router;