import GitHubRequestor from '../github/github.js';

export interface AuthTestResult {
  success: boolean;
  message: string;
  scopes?: string[];
  rateLimit?: {
    remaining: number;
    limit: number;
    reset: Date;
  };
}

/**
 * Test GitHub authentication and get rate limit and scope information
 * @param requestor GitHub requestor instance to test
 * @param silent Whether to suppress console output
 * @returns Authentication test result
 */
export async function testGitHubAuth(
  requestor: GitHubRequestor,
  silent = false
): Promise<AuthTestResult> {
  const authTest = await requestor.testAuth();

  if (!silent) {
    if (!authTest.success) {
      throw new Error(`GitHub authentication failed: ${authTest.message}`);
    }
    console.log('✅ GitHub authentication successful');

    if (authTest.scopes) {
      console.log(`ℹ️ Token scopes: ${authTest.scopes.join(', ')}`);
    } else {
      console.log('⚠️ Warning: No token scopes detected');
    }

    if (authTest.rateLimit) {
      console.log(
        `ℹ️ API rate limit: ${authTest.rateLimit.remaining}/${authTest.rateLimit.limit} requests remaining`
      );
      console.log(
        `ℹ️ Rate limit resets at: ${authTest.rateLimit.reset.toLocaleString()}`
      );
    }
  }

  return authTest;
}
