import request from 'supertest';
import express, { Express } from 'express';
import issuesRoutes from '../../routes/issues';
import issueService from '../../services/issueService';

// Mock the issueService
jest.mock('../../services/issueService', () => ({
  findIssues: jest.fn(),
  findIssueById: jest.fn(),
  createIssue: jest.fn(),
  updateIssue: jest.fn(),
  deleteIssue: jest.fn(),
  addRelatedIssue: jest.fn(),
  removeRelatedIssue: jest.fn(),
}));

// Mock the namespace access middleware
jest.mock('../../middleware/checkNamespaceAccess', () => ({
  checkNamespaceAccess: jest.fn((req, res, next) => {
    // Add a default namespace if not passed
    if (!req.query.namespace) {
      req.query.namespace = 'test-namespace';
    }
    next();
  })
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Issues Routes', () => {
  let app: Express;

  // Set up a fresh app instance before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    // Mount the issues routes directly (not at /api/issues)
    app.use('/', issuesRoutes);
  });

  describe('GET /', () => {
    it('should return a list of issues', async () => {
      const mockIssues = {
        data: [
          {
            id: 'issue-1',
            title: 'Test Issue 1',
            description: 'Description 1',
            severity: 'major',
            issueType: 'build',
            state: 'ACTIVE',
            namespace: 'test-namespace'
          },
          {
            id: 'issue-2',
            title: 'Test Issue 2',
            description: 'Description 2',
            severity: 'minor',
            issueType: 'test',
            state: 'ACTIVE',
            namespace: 'test-namespace'
          }
        ],
        total: 2,
        limit: 50,
        offset: 0
      };

      (issueService.findIssues as jest.Mock).mockResolvedValue(mockIssues);

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockIssues);
      expect(issueService.findIssues).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle query parameters', async () => {
      const mockIssues = {
        data: [
          {
            id: 'issue-1',
            title: 'Test Issue 1',
            severity: 'major',
            namespace: 'test-namespace'
          }
        ],
        total: 1,
        limit: 10,
        offset: 0
      };

      (issueService.findIssues as jest.Mock).mockResolvedValue(mockIssues);

      await request(app)
        .get('/')
        .query({
          namespace: 'test-namespace',
          severity: 'major',
          limit: '10',
          offset: '0'
        });

      expect(issueService.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: 'test-namespace',
          severity: 'major',
          limit: 10,
          offset: 0
        })
      );
    });

    it('should handle service errors', async () => {
      (issueService.findIssues as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /:id', () => {
    it('should return a specific issue', async () => {
      const mockIssue = {
        id: 'issue-1',
        title: 'Test Issue',
        description: 'Test Description',
        severity: 'major',
        issueType: 'build',
        state: 'ACTIVE',
        namespace: 'test-namespace'
      };

      (issueService.findIssueById as jest.Mock).mockResolvedValue(mockIssue);

      const response = await request(app).get('/issue-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockIssue);
      expect(issueService.findIssueById).toHaveBeenCalledWith('issue-1');
    });

    it('should return 404 if issue is not found', async () => {
      (issueService.findIssueById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Issue not found');
    });
  });

  describe('POST /', () => {
    it('should create a new issue', async () => {
      const newIssue = {
        title: 'New Issue',
        description: 'New Description',
        severity: 'major',
        issueType: 'build',
        namespace: 'test-namespace',
        scope: {
          resourceType: 'component',
          resourceName: 'frontend'
        }
      };

      const createdIssue = {
        id: 'new-issue-id',
        ...newIssue,
        state: 'ACTIVE',
        detectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (issueService.createIssue as jest.Mock).mockResolvedValue(createdIssue);

      const response = await request(app)
        .post('/')
        .send(newIssue);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdIssue);
      expect(issueService.createIssue).toHaveBeenCalledWith(newIssue);
    });
  });

  describe('PUT /:id', () => {
    it('should update an existing issue', async () => {
      const existingIssue = {
        id: 'issue-1',
        title: 'Original Title',
        description: 'Original Description',
        severity: 'minor',
        issueType: 'build',
        state: 'ACTIVE',
        namespace: 'test-namespace'
      };

      const updateData = {
        title: 'Updated Title',
        severity: 'major'
      };

      const updatedIssue = {
        ...existingIssue,
        ...updateData
      };

      (issueService.findIssueById as jest.Mock).mockResolvedValue(existingIssue);
      (issueService.updateIssue as jest.Mock).mockResolvedValue(updatedIssue);

      const response = await request(app)
        .put('/issue-1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedIssue);
      expect(issueService.updateIssue).toHaveBeenCalledWith('issue-1', updateData);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete an issue', async () => {
      const existingIssue = {
        id: 'issue-1',
        title: 'Test Issue',
        namespace: 'test-namespace'
      };

      (issueService.findIssueById as jest.Mock).mockResolvedValue(existingIssue);
      (issueService.deleteIssue as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/issue-1');

      expect(response.status).toBe(204);
      expect(issueService.deleteIssue).toHaveBeenCalledWith('issue-1');
    });
  });

  describe('POST /:id/resolve', () => {
    it('should resolve an issue', async () => {
      const existingIssue = {
        id: 'issue-1',
        title: 'Test Issue',
        state: 'ACTIVE',
        namespace: 'test-namespace'
      };

      const resolvedIssue = {
        ...existingIssue,
        state: 'RESOLVED',
        resolvedAt: new Date().toISOString()
      };

      (issueService.findIssueById as jest.Mock).mockResolvedValue(existingIssue);
      (issueService.updateIssue as jest.Mock).mockResolvedValue(resolvedIssue);

      const response = await request(app).post('/issue-1/resolve');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(resolvedIssue);
      expect(issueService.updateIssue).toHaveBeenCalledWith('issue-1', {
        state: 'RESOLVED',
        resolvedAt: expect.any(Date)
      });
    });
  });

  describe('POST /:id/related', () => {
    it('should add a related issue', async () => {
      const relatedData = {
        relatedId: 'related-issue-id'
      };

      (issueService.addRelatedIssue as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/issue-1/related')
        .send(relatedData);

      expect(response.status).toBe(201);
      expect(issueService.addRelatedIssue).toHaveBeenCalledWith('issue-1', 'related-issue-id');
    });
  });

  describe('DELETE /:id/related/:relatedId', () => {
    it('should remove a related issue', async () => {
      (issueService.removeRelatedIssue as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/issue-1/related/related-issue-id');

      expect(response.status).toBe(204);
      expect(issueService.removeRelatedIssue).toHaveBeenCalledWith('issue-1', 'related-issue-id');
    });
  });
});