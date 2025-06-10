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

export const CREATE_SECURITY_TABLE = `
CREATE TABLE security (
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
