import { Request, Response, NextFunction } from 'express';
import { Severity, IssueType, IssueState } from '@prisma/client';

// Validate create issue request
export function validateCreateIssue(req: Request, res: Response, next: NextFunction) {
  const {
    title,
    description,
    severity,
    issueType,
    namespace,
    scope
  } = req.body;

  // Check required fields
  const missingFields = [];
  if (!title) missingFields.push('title');
  if (!description) missingFields.push('description');
  if (!severity) missingFields.push('severity');
  if (!issueType) missingFields.push('issueType');
  if (!namespace) missingFields.push('namespace');
  if (!scope) missingFields.push('scope');
  else {
    if (!scope.resourceType) missingFields.push('scope.resourceType');
    if (!scope.resourceName) missingFields.push('scope.resourceName');
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields
    });
  }

  // Validate enum values
  const errors = [];

  if (!Object.values(Severity).includes(severity)) {
    errors.push(`Invalid severity value. Must be one of: ${Object.values(Severity).join(', ')}`);
  }

  if (!Object.values(IssueType).includes(issueType)) {
    errors.push(`Invalid issueType value. Must be one of: ${Object.values(IssueType).join(', ')}`);
  }

  if (req.body.state && !Object.values(IssueState).includes(req.body.state)) {
    errors.push(`Invalid state value. Must be one of: ${Object.values(IssueState).join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Validate links if present
  if (req.body.links && Array.isArray(req.body.links)) {
    const invalidLinks = req.body.links.filter((link: any) => {
      return !link.title || !link.url || typeof link.title !== 'string' || typeof link.url !== 'string';
    });

    if (invalidLinks.length > 0) {
      return res.status(400).json({
        error: 'Invalid links format',
        details: 'Each link must have title and url properties'
      });
    }
  }

  next();
}

// Validate update issue request
export function validateUpdateIssue(req: Request, res: Response, next: NextFunction) {
  const {
    severity,
    issueType,
    state,
    links
  } = req.body;

  const errors = [];

  // Validate enum values if present
  if (severity && !Object.values(Severity).includes(severity)) {
    errors.push(`Invalid severity value. Must be one of: ${Object.values(Severity).join(', ')}`);
  }

  if (issueType && !Object.values(IssueType).includes(issueType)) {
    errors.push(`Invalid issueType value. Must be one of: ${Object.values(IssueType).join(', ')}`);
  }

  if (state && !Object.values(IssueState).includes(state)) {
    errors.push(`Invalid state value. Must be one of: ${Object.values(IssueState).join(', ')}`);
  }

  // Validate links if present
  if (links) {
    if (!Array.isArray(links)) {
      errors.push('Links must be an array');
    } else {
      const invalidLinks = links.filter((link: any) => {
        return !link.title || !link.url || typeof link.title !== 'string' || typeof link.url !== 'string';
      });

      if (invalidLinks.length > 0) {
        errors.push('Each link must have title and url properties');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

// Validate ID parameter
export function validateIdParam(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;

  if (!id || id.trim() === '') {
    return res.status(400).json({
      error: 'Invalid ID parameter'
    });
  }

  next();
}
