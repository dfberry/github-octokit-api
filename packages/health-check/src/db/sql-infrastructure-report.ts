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

export const CREATE_INFRASTRUCTURE_TABLE = `
CREATE TABLE infrastructure (
  repo_id TEXT PRIMARY KEY,
  has_infrastructure INTEGER DEFAULT 0,
  infrastructure_types TEXT,
  has_azure_yaml INTEGER DEFAULT 0,
  azure_yaml_path TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repo_id) REFERENCES repositories(id)
);
`;

export const CREATE_INFRASTRUCTURE_FOLDERS_TABLE = `
CREATE TABLE infrastructure_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT,
  path TEXT NOT NULL,
  type TEXT NOT NULL,
  file_count INTEGER DEFAULT 0,
  FOREIGN KEY (repo_id) REFERENCES repositories(id)
);
`;
