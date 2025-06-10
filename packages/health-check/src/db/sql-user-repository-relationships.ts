// SQL for user_repository_relationships table and queries

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
