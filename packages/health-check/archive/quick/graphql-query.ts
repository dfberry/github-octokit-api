#!/usr/bin/env node
// @ts-nocheck
import { Octokit } from 'octokit';

/**
 * Simple GitHub GraphQL Query Tool
 *
 * This script fetches your GitHub profile information using GraphQL
 * to test your token's permissions and demonstrate GraphQL usage.
 *
 * Usage:
 *   GITHUB_TOKEN=your_token node quick-graphql-query.js
 */

// Get GitHub token from environment or exit
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  console.error('Usage: GITHUB_TOKEN=your_token node quick-graphql-query.js');
  process.exit(1);
}

// Initialize Octokit with your token
const octokit = new Octokit({ auth: token });

// Create a GraphQL query to fetch your own profile data
const query = `
query {
  viewer {
    login
    name
    bio
    company
    location
    email
    avatarUrl
    url
    twitterUsername
    followers {
      totalCount
    }
    following {
      totalCount
    }
    repositories(first: 10, privacy: PUBLIC, orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount
      nodes {
        name
        stargazerCount
        forkCount
        updatedAt
      }
    }
    contributionsCollection {
      totalRepositoryContributions
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      contributionCalendar {
        totalContributions
      }
    }
    organizations(first: 10) {
      nodes {
        login
        name
      }
    }
  }
  rateLimit {
    limit
    remaining
    resetAt
    cost
  }
}
`;

// Execute the query
async function fetchProfile() {
  try {
    console.log('Fetching your GitHub profile with GraphQL...\n');

    const response = await octokit.graphql(query);

    // Format and display the profile information
    const viewer = response.viewer;
    const rateLimit = response.rateLimit;

    console.log('🧑‍💻 Your GitHub Profile:');
    console.log('=======================');
    console.log(`Name: ${viewer.name || '(not set)'}`);
    console.log(`Username: ${viewer.login}`);
    console.log(`Bio: ${viewer.bio || '(not set)'}`);
    console.log(`Company: ${viewer.company || '(not set)'}`);
    console.log(`Location: ${viewer.location || '(not set)'}`);
    console.log(`Email: ${viewer.email || '(not public)'}`);
    console.log(
      `Twitter: ${viewer.twitterUsername ? '@' + viewer.twitterUsername : '(not set)'}`
    );
    console.log(`Followers: ${viewer.followers.totalCount}`);
    console.log(`Following: ${viewer.following.totalCount}`);

    console.log('\n📊 Contribution Stats:');
    console.log('====================');
    const contributions = viewer.contributionsCollection;
    console.log(
      `Total Repositories Contributed To: ${contributions.totalRepositoryContributions}`
    );
    console.log(`Total Commits: ${contributions.totalCommitContributions}`);
    console.log(`Total Issues: ${contributions.totalIssueContributions}`);
    console.log(
      `Total Pull Requests: ${contributions.totalPullRequestContributions}`
    );
    console.log(
      `Total PR Reviews: ${contributions.totalPullRequestReviewContributions}`
    );
    console.log(
      `Total Contributions: ${contributions.contributionCalendar.totalContributions}`
    );

    console.log('\n📚 Top Repositories:');
    console.log('==================');
    viewer.repositories.nodes.forEach(repo => {
      console.log(
        `${repo.name} - ⭐ ${repo.stargazerCount} - 🍴 ${repo.forkCount}`
      );
    });

    if (viewer.organizations.nodes.length > 0) {
      console.log('\n🏢 Organizations:');
      console.log('================');
      viewer.organizations.nodes.forEach(org => {
        console.log(`${org.name || org.login}`);
      });
    }

    console.log('\n⚙️ API Rate Limit Info:');
    console.log('=====================');
    console.log(`Limit: ${rateLimit.limit}`);
    console.log(`Remaining: ${rateLimit.remaining}`);
    console.log(`Resets at: ${rateLimit.resetAt}`);
    console.log(`Query cost: ${rateLimit.cost}`);

    // Display token scope information
    console.log('\n🔑 Token Information:');
    console.log('===================');
    const tokenInfo = await octokit.rest.users.getAuthenticated();
    console.log(
      `Token scopes: ${tokenInfo.headers['x-oauth-scopes'] || 'None specified'}`
    );

    console.log('\nQuery completed successfully! ✅');
  } catch (error) {
    console.error('Error fetching profile:', error);

    if (error.message.includes('Bad credentials')) {
      console.error(
        '\n❌ Authentication failed. Your token might be invalid or expired.'
      );
    } else if (error.message.includes('resource not accessible')) {
      console.error(
        '\n❌ Permission denied. Your token might not have the necessary scopes.'
      );
      console.error('Try creating a token with at least the "user" scope.');
    }

    // Try to get more error details
    try {
      const checkAuth = await octokit.rest.users.getAuthenticated();
      console.log(
        '\nHowever, basic authentication works. Token scopes:',
        checkAuth.headers['x-oauth-scopes'] || 'None specified'
      );
    } catch (e) {
      console.error(
        '\nCould not authenticate at all. Please check your token.'
      );
    }
  }
}

fetchProfile();
