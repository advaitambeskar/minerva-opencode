/**
 * Per-project agent database schema.
 *
 * Tables:
 *   memory_docs          - tracks which markdown files have been indexed
 *   memory_docs_fts      - FTS5 full-text index over memory sections (virtual table, created in init())
 *   memory_items         - extracted durable memory facts with provenance
 *   tasks                - hierarchical task graph (T1, T1.1, …)
 *   workflow_runs        - workflow orchestration state
 *   workflow_steps       - per-step results within a workflow run
 *   code_chunks          - source code chunks for semantic index (P2)
 *   code_chunks_fts      - FTS5 identifier/symbol search (virtual table, created in init())
 *   agent_migrations     - migration tracking
 */

export * as AgentSchema from "./schema.sql"

export const INIT_SQL = `
-- Memory documents tracking
CREATE TABLE IF NOT EXISTS memory_docs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  kind TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Extracted durable memory facts
CREATE TABLE IF NOT EXISTS memory_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  source_path TEXT NOT NULL,
  source_section TEXT,
  confidence INTEGER NOT NULL DEFAULT 80,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  superseded_by TEXT,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_memory_items_project ON memory_items(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_items_kind ON memory_items(project_id, kind);

-- FTS5 full-text index over memory sections
CREATE VIRTUAL TABLE IF NOT EXISTS memory_docs_fts USING fts5(
  doc_id UNINDEXED,
  project_id UNINDEXED,
  path UNINDEXED,
  kind UNINDEXED,
  section,
  body,
  tokenize = 'unicode61'
);

-- Hierarchical task graph
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  depends_on TEXT NOT NULL DEFAULT '[]',
  evidence TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(project_id, status);

-- Workflow orchestration
CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_json TEXT NOT NULL DEFAULT '{}',
  current_step TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_project ON workflow_runs(project_id, status);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  agent_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  input_json TEXT,
  output_json TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY(workflow_run_id) REFERENCES workflow_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_run ON workflow_steps(workflow_run_id);

-- Source code chunks for semantic index (P2)
CREATE TABLE IF NOT EXISTS code_chunks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  mtime INTEGER NOT NULL,
  language TEXT,
  symbol_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_code_chunks_project_path ON code_chunks(project_id, path);

-- FTS5 identifier/symbol/error-string search over code
CREATE VIRTUAL TABLE IF NOT EXISTS code_chunks_fts USING fts5(
  chunk_id UNINDEXED,
  project_id UNINDEXED,
  path UNINDEXED,
  body,
  tokenize = 'unicode61'
);

-- Migration tracking (separate from global opencode DB migrations)
CREATE TABLE IF NOT EXISTS agent_migrations (
  id TEXT PRIMARY KEY,
  time_completed INTEGER NOT NULL
);
`
