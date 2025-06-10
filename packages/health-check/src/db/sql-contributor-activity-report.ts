// SQL queries for contributor activity report using user_repository_relationships

export const SQL_GET_CONTRIBUTOR_ACTIVITY = `
SELECT
  c.login,
  c.name,
  urr.repo_id,
  urr.contributed_to,
  urr.owned,
  urr.starred,
  urr.has_issues,
  urr.has_prs,
  urr.data_inserted_at,
  cip.type AS item_type,
  cip.item_id,
  cip.number,
  cip.title AS item_title,
  cip.url AS item_url,
  cip.state AS item_state,
  cip.created_at AS item_created_at,
  cip.updated_at AS item_updated_at,
  cip.closed_at AS item_closed_at
FROM contributors c
JOIN user_repository_relationships urr ON c.login = urr.user_login
LEFT JOIN contributor_issues_prs cip
  ON cip.username = c.login AND cip.repo_full_name = urr.repo_id
ORDER BY c.login, urr.repo_id, cip.type DESC, cip.created_at DESC;
`;

export const SQL_GET_CONTRIBUTOR_ACTIVITY_FOR_USER = `
SELECT urr.repo_id, urr.contributed_to, urr.owned, urr.starred, urr.has_issues, urr.has_prs, urr.data_inserted_at
FROM user_repository_relationships urr
WHERE urr.user_login = ?
ORDER BY urr.repo_id;
`;
