// Consolidated SQL statements for the health-check database
// Organized by table and operation for deduplication and clarity

// --- Contributors ---
export const CREATE_CONTRIBUTORS_TABLE = `
CREATE TABLE IF NOT EXISTS contributors (
  id TEXT PRIMARY KEY UNIQUE NOT NULL,
  name TEXT,
  company TEXT,
  blog TEXT,
  location TEXT,
  email TEXT,
  bio TEXT,
  twitter TEXT,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  public_repos INTEGER DEFAULT 0,
  public_gists INTEGER DEFAULT 0,
  avatar_url TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
)
`;

export const INSERT_CONTRIBUTORS = `INSERT OR REPLACE INTO contributors (
  id, name, company, blog, location, email, bio, twitter,
  followers, following, public_repos, public_gists, avatar_url
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export const SQL_GET_ALL_CONTRIBUTORS = `
SELECT id, name, company, followers, following FROM contributors;
`;

export const SQL_GET_TOP_CONTRIBUTORS = `
SELECT id, name, followers FROM contributors ORDER BY followers DESC LIMIT 10;
`;

export const SQL_SEARCH_CONTRIBUTORS = `
SELECT * FROM contributors WHERE name LIKE '%Microsoft%' OR company LIKE '%Microsoft%';
`;

export const SQL_GET_COMPANY_CONTRIBUTORS = `
SELECT id, name, company, bio, location 
FROM contributors 
WHERE LOWER(company) LIKE LOWER(?)
ORDER BY name
`;

export const SQL_GET_ACTIVE_CONTRIBUTORS = `
SELECT c.id, c.name, COUNT(DISTINCT rc.repo_id) as repo_count, 
       MAX(rc.last_contributed_at) as latest_contribution
FROM contributors c
JOIN repo_contributors rc ON c.id = rc.contributor_login
GROUP BY c.id
ORDER BY latest_contribution DESC
LIMIT 20
`;

// --- Repo Contributors ---
export const CREATE_REPO_CONTRIBUTORS_TABLE = `
CREATE TABLE IF NOT EXISTS repo_contributors (
  repo_id TEXT,
  contributor_login TEXT,
  contribution_count INTEGER DEFAULT 0,
  is_maintainer INTEGER DEFAULT 0,
  last_contributed_at TEXT,
  PRIMARY KEY (repo_id, contributor_login),
  FOREIGN KEY (repo_id) REFERENCES repositories(id),
  FOREIGN KEY (contributor_login) REFERENCES contributors(id)
)
`;

export const INSERT_REPO_CONTRIBUTORS = `INSERT OR REPLACE INTO repo_contributors (
  repo_id, contributor_login, contribution_count, is_maintainer, last_contributed_at
) VALUES (?, ?, ?, ?, ?)`;

export const INSERT_CONTRIBUTOR_ISSUE_PRS = `INSERT INTO contributor_issues_prs (
          username, type, id, number, title, url, org, repo, state, created_at, updated_at, closed_at, repo_full_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export const SQL_GET_CONTRIBUTORS_WITH_REPO_COUNTS = `
SELECT c.id, c.name, COUNT(rc.repo_id) as repo_count
FROM contributors c
JOIN repo_contributors rc ON c.id = rc.contributor_login
GROUP BY c.id
ORDER BY repo_count DESC;
`;

export const SQL_GET_REPOS_FOR_CONTRIBUTOR = `
SELECT r.full_name, r.description, rc.contribution_count, rc.last_contributed_at
FROM repositories r
JOIN repo_contributors rc ON r.id = rc.repo_id
WHERE rc.contributor_login = ?
ORDER BY rc.last_contributed_at DESC;
`;

export const SQL_FIND_MULTI_REPO_CONTRIBUTORS = `
SELECT c.id, c.name, COUNT(DISTINCT rc.repo_id) as repo_count
FROM contributors c
JOIN repo_contributors rc ON c.id = rc.contributor_login
GROUP BY c.id
HAVING repo_count > 1
ORDER BY repo_count DESC;
`;

// --- Repositories ---
export const INSERT_REPOSITORIES = `INSERT OR REPLACE INTO repositories (
  id, org, repo, full_name, description, diskUsage,
  language,
  license, stars, forks, watchers, issues, pulls, 
  last_commit_date, archived, topics, status, readme
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// full_name is org/repo
export const SQL_GET_ALL_REPOSITORY_IDs =
  'SELECT full_name FROM repositories order by full_name';

export const SQL_GET_REPOSITORY_COUNT =
  'SELECT COUNT(*) as count FROM repositories';

export const SQL_GET_TOP_REPOSITORIES = `SELECT org, repo, description, stars, forks, watchers, topics
FROM repositories 
ORDER BY stars DESC 
LIMIT ?`;

export const SQL_GET_REPOSITORIES_BY_TOPIC = `SELECT org, repo, description, stars, topics
FROM repositories 
WHERE topics LIKE ? 
ORDER BY stars DESC`;

// --- Infrastructure ---
export const CREATE_INFRASTRUCTURE_TABLE = `
CREATE TABLE IF NOT EXISTS infrastructure (
  repo_id TEXT PRIMARY KEY,
  has_infrastructure INTEGER DEFAULT 0,
  infrastructure_types TEXT,
  has_azure_yaml INTEGER DEFAULT 0,
  azure_yaml_path TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repo_id) REFERENCES repositories(id)
);
`;

export const SQL_GET_REPOS_WITH_INFRASTRUCTURE = `
SELECT r.full_name, i.has_infrastructure, i.infrastructure_types, i.has_azure_yaml, i.azure_yaml_path
FROM repositories r
JOIN infrastructure i ON r.id = i.repo_id
WHERE i.has_infrastructure = 1
ORDER BY r.full_name;
`;

export const SQL_GET_REPOS_WITH_BICEP_INFRASTRUCTURE = `
SELECT r.full_name, i.infrastructure_types
FROM repositories r
JOIN infrastructure i ON r.id = i.repo_id
WHERE i.infrastructure_types LIKE '%bicep%'
ORDER BY r.full_name;
`;

export const SQL_GET_REPOS_WITH_AZURE_YAML = `
SELECT r.full_name, i.azure_yaml_path
FROM repositories r
JOIN infrastructure i ON r.id = i.repo_id
WHERE i.has_azure_yaml = 1
ORDER BY r.full_name;
`;

// --- Security ---
export const CREATE_SECURITY_TABLE = `
CREATE TABLE IF NOT EXISTS security (
  repo_id TEXT PRIMARY KEY,
  security_notices INTEGER DEFAULT 0,
  has_vulnerabilities INTEGER DEFAULT 0,
  dependabot_alerts_count INTEGER DEFAULT -1,
  code_scanning INTEGER DEFAULT 0,
  security_status TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repo_id) REFERENCES repositories(id)
);
`;

export const SQL_GET_REPOS_WITH_SECURITY_ISSUES = `
SELECT r.full_name, s.security_notices, s.has_vulnerabilities, 
       s.dependabot_alerts_count, s.code_scanning, s.security_status
FROM repositories r
JOIN security s ON r.id = s.repo_id
WHERE s.security_status = 'Issues'
ORDER BY r.full_name;
`;

export const SQL_GET_REPOS_WITH_NO_PROTECTIONS = `
SELECT r.full_name, s.dependabot_alerts_count, s.code_scanning
FROM repositories r
JOIN security s ON r.id = s.repo_id
WHERE s.security_status = 'No protections'
ORDER BY r.full_name;
`;

export const SQL_GET_REPOS_WITHOUT_CODE_SCANNING = `
SELECT r.full_name, r.stars, r.forks
FROM repositories r
JOIN security s ON r.id = s.repo_id
WHERE s.code_scanning = 0
ORDER BY r.stars DESC;
`;

// --- Workflows ---
export const CREATE_WORKFLOWS_TABLE = `
CREATE TABLE IF NOT EXISTS workflows (
  id INTEGER PRIMARY KEY,
  repo_id TEXT,
  name TEXT NOT NULL,
  path TEXT,
  state TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repo_id) REFERENCES repositories(id)
);
`;

export const INSERT_WORKFLOWS = `INSERT INTO workflows (id, repo_id, name, path, state, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`;

export const CREATE_REPOSITORY_TABLE = `CREATE TABLE IF NOT EXISTS repositories (
  id TEXT PRIMARY KEY,
  org TEXT NOT NULL,
  repo TEXT NOT NULL,
  full_name TEXT UNIQUE NOT NULL, 
  description TEXT,
  diskUsage INTEGER DEFAULT 0,
  language TEXT,
  license TEXT,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  issues INTEGER DEFAULT 0,
  pulls INTEGER DEFAULT 0,
  last_commit_date TEXT,
  archived INTEGER DEFAULT 0,
  topics TEXT,
  status TEXT,
  readme TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`;

export const CREATE_WORKFLOW_RUNS_TABLE = `
CREATE TABLE IF NOT EXISTS workflow_runs (
  id INTEGER PRIMARY KEY,
  workflow_id INTEGER,
  status TEXT,
  conclusion TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  html_url TEXT,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);
`;

export const CREATE_WORKFLOW_RUNS = `INSERT INTO workflow_runs (id, workflow_id, status, conclusion, created_at, updated_at, html_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)`;

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

// --- User Repository Relationships ---
export const CREATE_USER_REPOSITORY_RELATIONSHIPS_TABLE = `
CREATE TABLE IF NOT EXISTS user_repository_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_login TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  contributed_to BOOLEAN DEFAULT 0,
  owned BOOLEAN DEFAULT 0,
  starred BOOLEAN DEFAULT 0,
  has_issues BOOLEAN DEFAULT 0,
  has_prs BOOLEAN DEFAULT 0,
  data_inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_login, repo_id)
);
`;

export const INSERT_INFRASTRUCTURE = `INSERT INTO infrastructure (repo_id, has_infrastructure, infrastructure_types, has_azure_yaml, azure_yaml_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`;

export const GET_REPO_CONTRIBUTORS = `SELECT c.*, rc.contribution_count, rc.is_maintainer, rc.last_contributed_at 
       FROM contributors c
       JOIN repo_contributors rc ON c.id = rc.contributor_login
       WHERE rc.repo_id = ?
       ORDER BY rc.contribution_count DESC`;

export const GET_TOP_REPO_CONTRIBUTORS = `SELECT c.id, c.name, c.company, c.avatar_url, 
              COUNT(DISTINCT rc.repo_id) as repo_count,
              SUM(rc.contribution_count) as total_contributions
       FROM contributors c
       JOIN repo_contributors rc ON c.id = rc.contributor_login
       GROUP BY c.id
       ORDER BY total_contributions DESC
       LIMIT ?`;

export const INSERT_OR_UPDATE_USER_REPOSITORY_RELATIONSHIP = `
INSERT INTO user_repository_relationships (
  user_login, repo_id, contributed_to, owned, starred, has_issues, has_prs, data_inserted_at
) VALUES (
  $user_login, $repo_id, $contributed_to, $owned, $starred, $has_issues, $has_prs, $data_inserted_at
)
ON CONFLICT(user_login, repo_id) DO UPDATE SET
  contributed_to=excluded.contributed_to,
  owned=excluded.owned,
  starred=excluded.starred,
  has_issues=excluded.has_issues,
  has_prs=excluded.has_prs,
  data_inserted_at=excluded.data_inserted_at;
`;

// --- Contributor Activity ---
export const SQL_GET_CONTRIBUTOR_ACTIVITY = `
SELECT
  c.id,
  c.name,
  cip.repo_full_name AS repo_id,
  NULL AS contributed_to,
  NULL AS owned,
  NULL AS starred,
  NULL AS has_issues,
  NULL AS has_prs,
  NULL AS data_inserted_at,
  cip.type AS item_type,
  cip.id, AS item_id,
  cip.number,
  cip.title AS item_title,
  cip.url AS item_url,
  cip.org AS item_org,
  cip.repo AS item_repo,
  cip.state AS item_state,
  cip.created_at AS item_created_at,
  cip.updated_at AS item_updated_at,
  cip.closed_at AS item_closed_at
FROM contributors c
LEFT JOIN contributor_issues_prs cip
  ON cip.username = c.id
ORDER BY c.id, cip.repo_full_name, cip.type DESC, cip.created_at DESC;
`;

export const SQL_GET_REPOS_WITH_VULNERABILITIES = `
SELECT r.org, r.repo, r.stars, s.security_notices 
FROM repositories r
JOIN security_data s ON r.id = s.repo_id
WHERE s.has_vulnerabilities = 1
ORDER BY s.security_notices DESC;
`;

export const SQL_GET_REPOS_WITHOUT_DEPENDABOT = `
SELECT r.org, r.repo 
FROM repositories r
JOIN security_data s ON r.id = s.repo_id
WHERE s.dependabot_alerts = -1;
`;

export const INSERT_SECURITY = `INSERT INTO security (repo_id, security_notices, has_vulnerabilities, dependabot_alerts, code_scanning, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`;

export const CREATE_INFRASTRUCTURE_FOLDERS_TABLE = `
CREATE TABLE IF NOT EXISTS infrastructure_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT,
  path TEXT NOT NULL,
  type TEXT NOT NULL,
  file_count INTEGER DEFAULT 0,
  FOREIGN KEY (repo_id) REFERENCES repositories(id)
);
`;

export const SQL_GET_CONTRIBUTOR_REPOS = `
SELECT r.org, r.repo, r.description, rc.contribution_count, rc.last_contributed_at
FROM repositories r
JOIN repo_contributors rc ON r.id = rc.repo_id
WHERE rc.contributor_login = ?
`;

// --- Contributor Issues PRs ---
export const CREATE_CONTRIBUTOR_ISSUES_PRS_TABLE = `
CREATE TABLE IF NOT EXISTS contributor_issues_prs (
  username TEXT NOT NULL,
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  number INTEGER,
  title TEXT,
  url TEXT,
  org TEXT,
  repo TEXT,
  state TEXT,
  created_at TEXT,
  updated_at TEXT,
  closed_at TEXT,
  repo_full_name TEXT,
  PRIMARY KEY (username, type, id)
);
`;

export const GET_REPOSITORIES = `
SELECT id, org, repo, full_name, description, stars, forks, watchers, issues, pulls, last_commit_date, archived, topics, status, readme, timestamp
FROM repositories
WHERE archived = 0
ORDER BY org, repo;`;
