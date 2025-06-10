export const SQL_GET_ALL_WORKFLOWS_AND_STATUS = `
SELECT r.full_name, w.name, w.state, wr.status, wr.conclusion, wr.created_at, wr.updated_at
FROM repositories r
JOIN workflows w ON r.id = w.repo_id
LEFT JOIN workflow_runs wr ON w.id = wr.workflow_id
ORDER BY r.full_name, w.name;
`;

export const SQL_GET_REPOS_WITH_ACTIVE_WORKFLOWS = `
SELECT r.full_name, COUNT(w.id) as workflow_count
FROM repositories r
JOIN workflows w ON r.id = w.repo_id
WHERE w.state = 'active'
GROUP BY r.full_name
ORDER BY workflow_count DESC;
`;

export const SQL_GET_REPOS_WITH_FAILED_WORKFLOW_RUNS = `
SELECT r.full_name, w.name, wr.conclusion, wr.updated_at
FROM repositories r
JOIN workflows w ON r.id = w.repo_id
JOIN workflow_runs wr ON w.id = wr.workflow_id
WHERE wr.conclusion = 'failure'
ORDER BY wr.updated_at DESC;
`;

export const CREATE_WORKFLOWS_TABLE = `
CREATE TABLE workflows (
  id INTEGER PRIMARY KEY,
  repo_id TEXT,
  name TEXT NOT NULL,
  path TEXT,
  state TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repo_id) REFERENCES repositories(id)
);
`;

export const CREATE_WORKFLOW_RUNS_TABLE = `
CREATE TABLE workflow_runs (
  id INTEGER PRIMARY KEY,
  workflow_id INTEGER,
  status TEXT,
  conclusion TEXT,
  created_at TEXT,
  updated_at TEXT,
  html_url TEXT,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);
`;
