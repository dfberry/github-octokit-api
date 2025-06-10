import GitHubRequestor from '../github/github.js';

/**
 * Performs authentication test with GitHub and displays results
 * @param token GitHub token to test
 * @returns True if authentication successful, false otherwise
 */
export async function performAuthTest(token: string): Promise<boolean> {
  const requestor = new GitHubRequestor(token);

  try {
    console.log('🔍 Testing GitHub authentication...');

    const authResult = await requestor.testAuth();

    if (!authResult.success) {
      console.error(`❌ GitHub authentication failed: ${authResult.message}`);
      return false;
    }

    console.log('✅ GitHub authentication successful');

    // Display rate limit information if available
    if (authResult.rateLimit) {
      console.log(
        `Rate limit: ${authResult.rateLimit.remaining}/${authResult.rateLimit.limit} requests remaining`
      );
      const resetTime = new Date(authResult.rateLimit.reset);
      console.log(`Rate limit resets at: ${resetTime.toLocaleTimeString()}`);
    }

    // Display token scopes if available
    if (authResult.scopes && authResult.scopes.length > 0) {
      console.log(`Token scopes: ${authResult.scopes.join(', ')}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error testing GitHub authentication:', error);
    return false;
  }
}
