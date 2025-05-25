-- Create "issue_scopes" table
CREATE TABLE "public"."issue_scopes" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "resource_type" text NOT NULL,
 "resource_name" text NOT NULL,
 "resource_namespace" text NOT NULL,
 PRIMARY KEY ("id")
);
-- Create "issues" table
CREATE TABLE "public"."issues" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "title" text NOT NULL,
 "description" text NOT NULL,
 "severity" character varying(20) NOT NULL,
 "issue_type" character varying(20) NOT NULL,
 "state" character varying(20) NULL DEFAULT 'ACTIVE',
 "detected_at" timestamptz NOT NULL,
 "resolved_at" timestamptz NULL,
 "namespace" text NOT NULL,
 "scope_id" uuid NOT NULL,
 "created_at" timestamptz NULL,
 "updated_at" timestamptz NULL,
 PRIMARY KEY ("id"),
 CONSTRAINT "uni_issues_scope_id" UNIQUE ("scope_id"),
 CONSTRAINT "fk_issue_scopes_issue" FOREIGN KEY ("scope_id") REFERENCES "public"."issue_scopes" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "links" table
CREATE TABLE "public"."links" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "title" text NOT NULL,
 "url" text NOT NULL,
 "issue_id" uuid NOT NULL,
 PRIMARY KEY ("id"),
 CONSTRAINT "fk_issues_links" FOREIGN KEY ("issue_id") REFERENCES "public"."issues" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "related_issues" table
CREATE TABLE "public"."related_issues" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "source_id" uuid NOT NULL,
 "target_id" uuid NOT NULL,
 PRIMARY KEY ("id"),
 CONSTRAINT "fk_issues_related_from" FOREIGN KEY ("source_id") REFERENCES "public"."issues" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
 CONSTRAINT "fk_issues_related_to" FOREIGN KEY ("target_id") REFERENCES "public"."issues" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
