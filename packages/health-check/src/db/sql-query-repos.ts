// SQL constants for query-repos operations

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
