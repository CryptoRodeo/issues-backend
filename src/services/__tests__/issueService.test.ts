import issueService, { IssueCreateInput, IssueUpdateInput } from '../../services/issueService';
import prisma from '../../db';

// Mock the Prisma client
jest.mock('../../db', () => ({
  issue: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  issueScope: {
    create: jest.fn(),
    delete: jest.fn()
  },
  link: {
    createMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn()
  },
  relatedIssue: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  $transaction: jest.fn((arg) => {
    if (typeof arg === 'function') {
      // interactive transaction
      const tx = {
        issue: prisma.issue,
        issueScope: prisma.issueScope,
        link: prisma.link,
        relatedIssue: prisma.relatedIssue,
      };
      return arg(tx);
    } else if (Array.isArray(arg)) {
      // batch transaction
      return Promise.all(arg);
    }
  })
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Issue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findIssues', () => {
    it('should find issues with filters', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          title: 'Test Issue 1',
          scope: { resourceType: 'component' },
          links: []
        },
        {
          id: 'issue-2',
          title: 'Test Issue 2',
          scope: { resourceType: 'component' },
          links: []
        }
      ];

      const mockCount = 2;

      (prisma.issue.findMany as jest.Mock).mockResolvedValue(mockIssues);
      (prisma.issue.count as jest.Mock).mockResolvedValue(mockCount);

      const filters = {
        namespace: 'test-namespace',
        limit: 10,
        offset: 0
      };

      const result = await issueService.findIssues(filters);

      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            namespace: 'test-namespace'
          }),
          skip: 0,
          take: 10
        })
      );

      expect(result).toEqual({
        data: mockIssues,
        total: mockCount,
        limit: 10,
        offset: 0
      });
    });

    it('should handle resource type and name filters', async () => {
      const mockIssues = [{ id: 'issue-1', title: 'Test Issue 1' }];
      const mockCount = 1;

      (prisma.issue.findMany as jest.Mock).mockResolvedValue(mockIssues);
      (prisma.issue.count as jest.Mock).mockResolvedValue(mockCount);

      const filters = {
        namespace: 'test-namespace',
        resourceType: 'component',
        resourceName: 'frontend',
        limit: 10,
        offset: 0
      };

      await issueService.findIssues(filters);

      expect(prisma.issue.findMany).toHaveBeenCalledWith({
        "include": {
          "links": true,
          "relatedFrom": {
            "include": {
              "target": {
                "include": {
                  "scope": true
                }
              }
            }
          },
          "relatedTo": {
            "include": {
              "source": {
                "include": {
                  "scope": true
                }
              }
            }
          },
          "scope": true
        },
        "orderBy": {
          "detectedAt": "desc"
        },
        "skip": 0,
        "take": 10,
        "where": {
          "namespace": "test-namespace",
          "scope": {"resourceName": "frontend"
          }
        }
      });
    });
  });

  describe('findIssueById', () => {
    it('should find an issue by ID', async () => {
      const mockIssue = {
        id: 'issue-1',
        title: 'Test Issue',
        description: 'Test Description',
        scope: { resourceType: 'component' },
        links: []
      };

      (prisma.issue.findUnique as jest.Mock).mockResolvedValue(mockIssue);

      const result = await issueService.findIssueById('issue-1');

      expect(prisma.issue.findUnique).toHaveBeenCalledWith({
        where: { id: 'issue-1' },
        include: expect.any(Object)
      });

      expect(result).toEqual(mockIssue);
    });

    it('should return null if issue is not found', async () => {
      (prisma.issue.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await issueService.findIssueById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('createIssue', () => {
    it('should create a new issue', async () => {
      const mockCreatedIssue = {
        id: 'new-issue',
        title: 'New Issue',
        description: 'Description',
        severity: 'major',
        issueType: 'build',
        state: 'ACTIVE',
        namespace: 'test-namespace',
        scope: {
          resourceType: 'component',
          resourceName: 'frontend',
          resourceNamespace: 'test-namespace',
        },
        links: []
      };

      (prisma.issue.create as jest.Mock).mockResolvedValue(mockCreatedIssue);

      const issueData = {
        title: 'New Issue',
        description: 'Description',
        severity: 'major',
        issueType: 'build',
        namespace: 'test-namespace',
        scope: {
          resourceType: 'component',
          resourceName: 'frontend'
        }
      };

      const result = await issueService.createIssue(issueData as IssueCreateInput);

      expect(prisma.issue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New Issue',
            description: 'Description',
            severity: 'major',
            issueType: 'build',
            namespace: 'test-namespace'
          })
        })
      );

      expect(result).toEqual(mockCreatedIssue);
    });

    it('should prevent creating duplicate issues', async () => {
      const mockCreatedIssue = {
        id: 'new-issue',
        title: 'New Issue',
        description: 'Description',
        severity: 'major',
        issueType: 'build',
        state: 'ACTIVE',
        namespace: 'test-namespace',
        scope: {
          resourceType: 'component',
          resourceName: 'frontend',
          resourceNamespace: 'test-namespace',
        },
        links: []
      };

      (prisma.issue.create as jest.Mock).mockResolvedValue(mockCreatedIssue);

      const issueData = {
        title: 'New Issue',
        description: 'Description',
        severity: 'major',
        issueType: 'build',
        namespace: 'test-namespace',
        scope: {
          resourceType: 'component',
          resourceName: 'frontend',
          resourceNamespace: 'test-namespace',
        }
      };

      const result = await issueService.createIssue(issueData as IssueCreateInput);

      expect(prisma.issue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New Issue',
            description: 'Description',
            severity: 'major',
            issueType: 'build',
            namespace: 'test-namespace'
          })
        })
      );

      expect(result).toEqual(mockCreatedIssue);
      // Mock DB retrieving recently created issue
      (prisma.issue.findFirst as jest.Mock).mockResolvedValue(mockCreatedIssue);
      (prisma.issue.findUnique as jest.Mock).mockResolvedValue(mockCreatedIssue);
      // Now lets try creating the same issue again with the same data.

      // Test the check first
      const { isDuplicate, existingIssue } = await issueService.checkForDuplicateIssue(issueData as IssueCreateInput);
      expect(isDuplicate).toBeTruthy();

      // Now test creating the issue to ensure that the check is used
      const existing  = await issueService.createIssue(issueData as IssueCreateInput);
      expect(prisma.issue.update).toHaveBeenCalledWith({
          data: {
            description: "Description",
            issueType: "build",
            severity: "major",
            title: "New Issue",
            updatedAt: new Date(),
          },
          include: {
            links: true,
            scope: true,
          },
          where: {
            id: "new-issue",
          },
        });

    })
  });

  describe('updateIssue', () => {
    it('should update an existing issue', async () => {
      const mockExistingIssue = {
        id: 'issue-1',
        title: 'Old Title',
        description: 'Old Description',
        severity: 'minor',
        state: 'ACTIVE'
      };

      const mockUpdatedIssue = {
        ...mockExistingIssue,
        title: 'Updated Title',
        severity: 'major',
        links: []
      };

      (prisma.issue.findUnique as jest.Mock).mockResolvedValue(mockExistingIssue);
      (prisma.issue.update as jest.Mock).mockResolvedValue(mockUpdatedIssue);
      (prisma.link.findMany as jest.Mock).mockResolvedValue([]);

      const updateData = {
        title: 'Updated Title',
        severity: 'major'
      };

      const result = await issueService.updateIssue('issue-1', updateData as IssueUpdateInput);

      expect(prisma.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'issue-1' },
          data: expect.objectContaining({
            title: 'Updated Title',
            severity: 'major'
          })
        })
      );

      expect(result).toEqual(mockUpdatedIssue);
    });

    it('should throw error if issue does not exist', async () => {
      (prisma.issue.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(issueService.updateIssue('non-existent-id', {
        title: 'Updated Title'
      })).rejects.toThrow('Issue with ID non-existent-id not found');
    });

    it('should handle state change to RESOLVED', async () => {
      const mockExistingIssue = {
        id: 'issue-1',
        title: 'Test Issue',
        state: 'ACTIVE',
        resolvedAt: null
      };

      const mockUpdatedIssue = {
        ...mockExistingIssue,
        state: 'RESOLVED',
        resolvedAt: expect.any(Date),
        links: []
      };

      (prisma.issue.findUnique as jest.Mock).mockResolvedValue(mockExistingIssue);
      (prisma.issue.update as jest.Mock).mockResolvedValue(mockUpdatedIssue);
      (prisma.link.findMany as jest.Mock).mockResolvedValue([]);

      const updateData = {
        state: 'RESOLVED'
      };

      const result = await issueService.updateIssue('issue-1', updateData as IssueUpdateInput);

      expect(prisma.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'issue-1' },
          data: expect.objectContaining({
            state: 'RESOLVED',
            resolvedAt: expect.any(Date)
          })
        })
      );

      expect(result).toEqual(mockUpdatedIssue);
    });

    it('should update issue links when provided', async () => {
      const mockExistingIssue = {
        id: 'issue-1',
        title: 'Test Issue',
        links: [
          { id: 'link-1', title: 'Old Link', url: 'https://old-url.com' }
        ]
      };

      const mockUpdatedIssue = {
        ...mockExistingIssue,
        links: []
      };

      const newLinks = [
        { title: 'New Link', url: 'https://new-url.com' }
      ];

      const mockNewLinks = [
        { id: 'link-2', title: 'New Link', url: 'https://new-url.com', issueId: 'issue-1' }
      ];

      (prisma.issue.findUnique as jest.Mock).mockResolvedValue(mockExistingIssue);
      (prisma.issue.update as jest.Mock).mockResolvedValue(mockUpdatedIssue);
      (prisma.link.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.link.findMany as jest.Mock).mockResolvedValue(mockNewLinks);

      const updateData = {
        links: newLinks
      };

      await issueService.updateIssue('issue-1', updateData);

      expect(prisma.link.deleteMany).toHaveBeenCalledWith({
        where: { issueId: 'issue-1' }
      });
    });
  });

  describe('deleteIssue', () => {
    it('should delete an issue and related entities', async () => {
      const mockIssue = {
        id: 'issue-1',
        scopeId: 'scope-1'
      };

      (prisma.issue.findUnique as jest.Mock).mockResolvedValue(mockIssue);

      await issueService.deleteIssue('issue-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.relatedIssue.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { sourceId: 'issue-1' },
            { targetId: 'issue-1' }
          ]
        }
      });
      expect(prisma.link.deleteMany).toHaveBeenCalledWith({
        where: { issueId: 'issue-1' }
      });
      expect(prisma.issue.delete).toHaveBeenCalledWith({
        where: { id: 'issue-1' }
      });
      expect(prisma.issueScope.delete).toHaveBeenCalledWith({
        where: { id: 'scope-1' }
      });
    });

    it('should throw error if issue does not exist', async () => {
      (prisma.issue.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(issueService.deleteIssue('non-existent-id'))
        .rejects.toThrow('Issue with ID non-existent-id not found');
    });
  });

  describe('addRelatedIssue', () => {
    it('should add a relationship between issues', async () => {
      const sourceIssue = { id: 'source-id', title: 'Source Issue' };
      const targetIssue = { id: 'target-id', title: 'Target Issue' };

      (prisma.issue.findUnique as jest.Mock)
        .mockResolvedValueOnce(sourceIssue)
        .mockResolvedValueOnce(targetIssue);

      (prisma.relatedIssue.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.relatedIssue.create as jest.Mock).mockResolvedValue({
        id: 'relation-id',
        sourceId: 'source-id',
        targetId: 'target-id'
      });

      await issueService.addRelatedIssue('source-id', 'target-id');

      expect(prisma.relatedIssue.create).toHaveBeenCalledWith({
        data: {
          sourceId: 'source-id',
          targetId: 'target-id'
        }
      });
    });

    it('should throw error if either issue does not exist', async () => {
      (prisma.issue.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'source-id' })
        .mockResolvedValueOnce(null);

      await expect(issueService.addRelatedIssue('source-id', 'non-existent-id'))
        .rejects.toThrow('One or both issues not found');
    });

    it('should throw error if relationship already exists', async () => {
      const sourceIssue = { id: 'source-id', title: 'Source Issue' };
      const targetIssue = { id: 'target-id', title: 'Target Issue' };

      (prisma.issue.findUnique as jest.Mock)
        .mockResolvedValueOnce(sourceIssue)
        .mockResolvedValueOnce(targetIssue);

      (prisma.relatedIssue.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-relation',
        sourceId: 'source-id',
        targetId: 'target-id'
      });

      await expect(issueService.addRelatedIssue('source-id', 'target-id'))
        .rejects.toThrow('Relationship already exists');
    });
  });

  describe('removeRelatedIssue', () => {
    it('should remove a relationship between issues', async () => {
      const mockRelation = {
        id: 'relation-id',
        sourceId: 'source-id',
        targetId: 'target-id'
      };

      (prisma.relatedIssue.findFirst as jest.Mock).mockResolvedValue(mockRelation);

      await issueService.removeRelatedIssue('source-id', 'target-id');

      expect(prisma.relatedIssue.delete).toHaveBeenCalledWith({
        where: { id: 'relation-id' }
      });
    });

    it('should throw error if relationship does not exist', async () => {
      (prisma.relatedIssue.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(issueService.removeRelatedIssue('source-id', 'target-id'))
        .rejects.toThrow('Relationship not found');
    });
  });
});
