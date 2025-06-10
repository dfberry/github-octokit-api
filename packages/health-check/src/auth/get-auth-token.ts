/**
 * Get GitHub authentication token with fallback support
 * @param argToken Optional token passed as argument
 * @returns Valid GitHub token
 */
export function getAuthToken(argToken: string | undefined = undefined): string {
  // Try in order: passed token, GITHUB_TOKEN, GITHUB_TOKEN_2
  const token: string =
    argToken || process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN_2 || '';

  if (!token) {
    throw new Error(
      'No GitHub token found. Please set GITHUB_TOKEN in the environment variables'
    );
  }

  // Validate basic token format
  if (!/^(ghp_)?[A-Za-z0-9_]{36,255}$/.test(token)) {
    throw new Error(
      'Invalid GitHub token format. Token should be at least 36 characters long and contain only letters, numbers and underscores'
    );
  }

  return token;
}
