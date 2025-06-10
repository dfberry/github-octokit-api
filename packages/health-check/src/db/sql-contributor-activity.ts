export const CREATE_REPO_CONTRIBUTORS_TABLE = `
CREATE TABLE repo_contributors (
  repo_id TEXT,
  contributor_login TEXT,
  contribution_count INTEGER DEFAULT 0,
  is_maintainer INTEGER DEFAULT 0,
  last_contributed_at TEXT,
  PRIMARY KEY (repo_id, contributor_login)
)
`;

export const SQL_GET_CONTRIBUTORS_WITH_REPO_COUNTS = `
SELECT c.login, c.name, COUNT(rc.repo_id) as repo_count
FROM contributors c
JOIN repo_contributors rc ON c.login = rc.contributor_login
GROUP BY c.login
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
SELECT c.login, c.name, COUNT(DISTINCT rc.repo_id) as repo_count
FROM contributors c
JOIN repo_contributors rc ON c.login = rc.contributor_login
GROUP BY c.login
HAVING repo_count > 1
ORDER BY repo_count DESC;
`;
