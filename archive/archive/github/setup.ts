import { Octokit } from 'octokit';

/**
 * Gets the GitHub token from process.env, prints it, tests it with a simple query, and returns the token.
 */
export async function getAndTestGitHubToken(): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN not found in environment variables.');
  }
  console.log('GitHub token:', token);

  // Test the token with a simple query (get authenticated user)
  const octokit = new Octokit({ auth: token });
  try {
    const { data } = await octokit.rest.users.getAuthenticated();
    console.log('Authenticated as:', data.login);
  } catch (error) {
    console.error('Failed to authenticate with GitHub:', error);
    throw error;
  }

  return token;
}
