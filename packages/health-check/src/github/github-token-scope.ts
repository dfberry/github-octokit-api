import { Octokit } from 'octokit';

// Helper functions to test specific access types
async function testRepositoryAccess(
  octokit: Octokit,
  testRepo: { owner: string; repo: string }
): Promise<boolean> {
  try {
    await octokit.rest.repos.get(testRepo);
    return true;
  } catch (err) {
    return false;
  }
}

async function testIssuesAccess(
  octokit: Octokit,
  testRepo: { owner: string; repo: string }
): Promise<boolean> {
  try {
    await octokit.rest.issues.listForRepo({
      ...testRepo,
      state: 'open',
      per_page: 1,
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function testPullRequestsAccess(
  octokit: Octokit,
  testRepo: { owner: string; repo: string }
): Promise<boolean> {
  try {
    await octokit.rest.pulls.list({
      ...testRepo,
      state: 'open',
      per_page: 1,
    });
    return true;
  } catch (err) {
    return false;
  }
}

export async function checkTokenScope(token: string): Promise<boolean> {
  if (!token) {
    console.error('GITHUB_TOKEN environment variable not set');
    return false;
  }

  const octokit = new Octokit({ auth: token });
  const testRepo = { owner: 'microsoft', repo: 'vscode' };

  try {
    console.log('Checking token scopes...');
    const { data: userResponse } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${userResponse.login}`);

    // Check rate limit which includes the scopes in headers
    const response = await octokit.request('GET /rate_limit');
    const scopes = response.headers['x-oauth-scopes'] || 'none';

    // Test actual access capabilities (not just scopes)
    console.log('\n🧪 Testing actual access capabilities...');

    // Test repository access
    console.log('Testing repository access...');
    const hasRepoAccess = await testRepositoryAccess(octokit, testRepo);
    if (hasRepoAccess) {
      console.log('✅ Repository access works');
    } else {
      console.log('❌ Repository access test failed');
    }

    // Test issues access
    console.log('Testing issues access...');
    const hasIssuesAccess = await testIssuesAccess(octokit, testRepo);
    if (hasIssuesAccess) {
      console.log('✅ Issues access works');
    } else {
      console.log('❌ Issues access test failed');
    }

    // Test pull requests access
    console.log('Testing pull requests access...');
    const hasPRAccess = await testPullRequestsAccess(octokit, testRepo);
    if (hasPRAccess) {
      console.log('✅ Pull requests access works');
    } else {
      console.log('❌ Pull requests access test failed');
    }

    console.log('\n📋 Token Scopes:');
    console.log(scopes);

    // Display permission checks for user information
    console.log('\n🔍 Permission Checks:');
    const hasRepoScope = scopes.includes('repo');
    const hasPublicRepoScope = scopes.includes('public_repo');
    const hasNoScope = scopes === 'none'; // GitHub allows public repo access without explicit scopes

    const hasMinimumScopes = hasNoScope || hasPublicRepoScope || hasRepoScope;

    // Overall summary for GitHub Health Check tool compatibility
    console.log('\n📝 GitHub Health Check Tool Compatibility:');

    // Return true if we have access to repositories, issues, and PRs
    const hasRequiredAccess = hasRepoAccess && hasIssuesAccess && hasPRAccess;

    if (hasMinimumScopes && hasRequiredAccess) {
      console.log(
        '✅ Your token has the minimum required access for the GitHub Health Check tool'
      );
      console.log(
        '   You should be able to check public repositories, issues, and pull requests'
      );

      if (!hasRepoScope && hasNoScope) {
        console.log(
          '⚠️ Note: Your token can only access public repositories, not private ones'
        );
      }
      return true;
    } else {
      console.log(
        '❌ Your token does not have sufficient access for the GitHub Health Check tool'
      );

      // Provide more specific feedback about which tests failed
      if (!hasRepoAccess) {
        console.log('   ❌ Unable to access repository data');
      }
      if (!hasIssuesAccess) {
        console.log('   ❌ Unable to access issue data');
      }
      if (!hasPRAccess) {
        console.log('   ❌ Unable to access pull request data');
      }
      if (!hasMinimumScopes) {
        console.log('   ❌ Token lacks required scopes');
      }

      console.log(
        '\n💡 For read-only access to repos, issues, and PRs, you need at minimum public_repo scope'
      );
      console.log(
        '💡 To access private repositories as well, you need the repo scope'
      );
      console.log(
        'Create or update your token at: https://github.com/settings/tokens'
      );
      return false;
    }
  } catch (error: unknown) {
    console.error('Error checking token:');

    if (error instanceof Error) {
      console.error(`- Message: ${error.message}`);

      // Check for common authentication errors
      if (error.message.includes('Bad credentials')) {
        console.error(
          '❌ Authentication failed: Your token appears to be invalid or expired.'
        );
        console.error(
          '💡 Please generate a new token at: https://github.com/settings/tokens'
        );
      } else if (error.message.includes('rate limit')) {
        console.error(
          '⚠️ Rate limit exceeded: You may need to wait before making more requests.'
        );
      }
    } else {
      console.error(`- ${String(error)}`);
    }

    return false;
  }
}
