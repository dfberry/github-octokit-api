// Check your GitHub token's scopes
import { Octokit } from 'octokit';

async function checkTokenScope() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('GITHUB_TOKEN environment variable not set');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });

  try {
    console.log('Checking token scopes...');
    const { data: userResponse } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${userResponse.login}`);

    // Check rate limit which includes the scopes in headers
    const response = await octokit.request('GET /rate_limit');
    const scopes = response.headers['x-oauth-scopes'] || 'none';

    // Test actual access capabilities (not just scopes)
    console.log('\n🧪 Testing actual access capabilities...');
    const testRepo = { owner: 'microsoft', repo: 'vscode' };

    // Test repository access
    try {
      console.log('Testing repository access...');
      const repoData = await octokit.rest.repos.get(testRepo);
      console.log(
        `✅ Repository access works: Retrieved ${repoData.data.full_name} (${repoData.data.stargazers_count} stars)`
      );
    } catch (err) {
      console.log(
        '❌ Repository access test failed:',
        err instanceof Error ? err.message : String(err)
      );
    }

    // Test issues access
    try {
      console.log('Testing issues access...');
      const issuesData = await octokit.rest.issues.listForRepo({
        ...testRepo,
        state: 'open',
        per_page: 1,
      });
      console.log(
        `✅ Issues access works: Retrieved ${issuesData.data.length} issue(s)`
      );
    } catch (err) {
      console.log(
        '❌ Issues access test failed:',
        err instanceof Error ? err.message : String(err)
      );
    }

    // Test pull requests access
    try {
      console.log('Testing pull requests access...');
      const prsData = await octokit.rest.pulls.list({
        ...testRepo,
        state: 'open',
        per_page: 1,
      });
      console.log(
        `✅ Pull requests access works: Retrieved ${prsData.data.length} PR(s)`
      );
    } catch (err) {
      console.log(
        '❌ Pull requests access test failed:',
        err instanceof Error ? err.message : String(err)
      );
    }

    console.log('\n📋 Token Scopes:');
    console.log(scopes);

    console.log('\n🔍 Permission Checks:');

    // Check user search permissions
    if (scopes.includes('read:user') || scopes.includes('user')) {
      console.log(
        '✅ User Search: Your token has read:user or user scope - should be able to search users'
      );
    } else {
      console.log(
        '❌ User Search: Your token is missing read:user or user scope - may not be able to search users'
      );
    }

    // Check repository access permissions
    if (
      scopes.includes('repo') ||
      scopes.includes('public_repo') ||
      scopes === 'none'
    ) {
      console.log(
        '✅ Repository Access: Your token can access ' +
          (scopes.includes('repo') ? 'public AND private' : 'public') +
          ' repositories'
      );
    } else {
      console.log(
        '❌ Repository Access: Your token may have limited repository access'
      );
    }

    // Check issue access permissions
    if (
      scopes.includes('repo') ||
      scopes.includes('public_repo') ||
      scopes.includes('read:issue') ||
      scopes === 'none'
    ) {
      console.log('✅ Issues Access: Your token should be able to read issues');
    } else {
      console.log(
        '❌ Issues Access: Your token may have limited issues access'
      );
    }

    // Check PR access permissions
    if (
      scopes.includes('repo') ||
      scopes.includes('public_repo') ||
      scopes.includes('read:pull_request') ||
      scopes === 'none'
    ) {
      console.log(
        '✅ Pull Request Access: Your token should be able to read PRs'
      );
    } else {
      console.log(
        '❌ Pull Request Access: Your token may have limited PR access'
      );
    }

    // Overall summary for GitHub Health Check tool compatibility
    console.log('\n📝 GitHub Health Check Tool Compatibility:');

    const hasMinimumScopes =
      scopes === 'none' || // GitHub allows reads on public resources without scopes
      scopes.includes('public_repo') ||
      scopes.includes('repo');

    if (hasMinimumScopes) {
      console.log(
        '✅ Your token appears to have the minimum required access for the GitHub Health Check tool'
      );
      console.log(
        '   You should be able to check public repositories, issues, and pull requests'
      );

      if (!scopes.includes('repo') && scopes !== 'none') {
        console.log(
          '⚠️ Note: Your token can only access public repositories, not private ones'
        );
      }
    } else {
      console.log(
        '❌ Your token may not have sufficient access for the GitHub Health Check tool'
      );
      console.log(
        '   You need at least public_repo scope to check repositories, issues, and PRs'
      );
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
  }
}

checkTokenScope();
