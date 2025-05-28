-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('info', 'minor', 'major', 'critical');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('build', 'test', 'release', 'dependency', 'pipeline');

-- CreateEnum
CREATE TYPE "IssueState" AS ENUM ('ACTIVE', 'RESOLVED');

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "issueType" "IssueType" NOT NULL,
    "state" "IssueState" NOT NULL DEFAULT 'ACTIVE',
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "namespace" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueScope" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "resourceNamespace" TEXT NOT NULL,

    CONSTRAINT "IssueScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedIssue" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,

    CONSTRAINT "RelatedIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Issue_scopeId_key" ON "Issue"("scopeId");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "IssueScope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedIssue" ADD CONSTRAINT "RelatedIssue_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedIssue" ADD CONSTRAINT "RelatedIssue_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
