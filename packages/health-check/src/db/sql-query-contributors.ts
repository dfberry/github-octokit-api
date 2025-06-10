export const SQL_GET_CONTRIBUTOR_REPOS = `
SELECT r.org, r.repo, r.description, rc.contribution_count, rc.last_contributed_at
FROM repositories r
JOIN repo_contributors rc ON r.id = rc.repo_id
WHERE rc.contributor_login = ?
`;

export const SQL_GET_TOP_CONTRIBUTORS = `
SELECT login, name, company, followers, following, public_repos 
FROM contributors 
ORDER BY followers DESC 
LIMIT ?
`;

export const SQL_GET_COMPANY_CONTRIBUTORS = `
SELECT login, name, company, bio, location 
FROM contributors 
WHERE LOWER(company) LIKE LOWER(?)
ORDER BY name
`;

export const SQL_GET_ACTIVE_CONTRIBUTORS = `
SELECT c.login, c.name, COUNT(DISTINCT rc.repo_id) as repo_count, 
       MAX(rc.last_contributed_at) as latest_contribution
FROM contributors c
JOIN repo_contributors rc ON c.login = rc.contributor_login
GROUP BY c.login
ORDER BY latest_contribution DESC
LIMIT 20
`;
