export const CREATE_CONTRIBUTORS_TABLE = `
CREATE TABLE contributors (
  login TEXT PRIMARY KEY,
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

export const SQL_GET_ALL_CONTRIBUTORS = `
SELECT login, name, company, followers, following FROM contributors;
`;

export const SQL_GET_TOP_CONTRIBUTORS = `
SELECT login, name, followers FROM contributors ORDER BY followers DESC LIMIT 10;
`;

export const SQL_SEARCH_CONTRIBUTORS = `
SELECT * FROM contributors WHERE name LIKE '%Microsoft%' OR company LIKE '%Microsoft%';
`;
