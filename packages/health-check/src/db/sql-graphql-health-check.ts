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
