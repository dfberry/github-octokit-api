#!/usr/bin/env node

/**
 * Simple script to test GraphQL user data functionality
 * Usage: GITHUB_TOKEN=your_token node quick-graphql-query.js username
 */
const { config } = require('dotenv');
const { Octokit } = require('octokit');

// Load environment variables from .env file
config();

// Get GitHub token from environment
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

// Get username from command line
const username = process.argv[2];
if (!username) {
  console.error('Error: Username argument is required');
  console.error('Usage: GITHUB_TOKEN=your_token node quick-graphql-query.js username');
  process.exit(1);
}

// Create Octokit instance
const octokit = new Octokit({ auth: token });

async function testGraphQLUserData() {
  console.log(`Testing GraphQL user data fetch for ${username}...`);
  
  const query = `
    query($username: String!) {
      user(login: $username) {
        login
        id
        name
        company
        bio
        location
        email
        websiteUrl
        avatarUrl
        url
        twitterUsername
        followers {
          totalCount
        }
        following {
          totalCount
        }
        createdAt
        updatedAt
        isHireable
        isDeveloperProgramMember
        isCampusExpert
        isSiteAdmin
        repositoriesContributedTo {
          totalCount
        }
        repositories(first: 0) {
          totalCount
        }
        starredRepositories {
          totalCount
        }
        organizations(first: 3) {
          totalCount
          nodes {
            login
            name
          }
        }
      }
    }
  `;
  
  try {
    console.time('GraphQL request');
    const result = await octokit.graphql(query, { username });
    console.timeEnd('GraphQL request');
    
    if (result && result.user) {
      // Transform to match REST API format
      const userData = {
        login: result.user.login,
        id: result.user.id,
        name: result.user.name,
        company: result.user.company,
        blog: result.user.websiteUrl,
        location: result.user.location,
        email: result.user.email,
        hireable: result.user.isHireable,
        bio: result.user.bio,
        twitter_username: result.user.twitterUsername,
        public_repos: result.user.repositories.totalCount,
        public_gists: 0, // Not available in basic GraphQL query
        followers: result.user.followers.totalCount,
        following: result.user.following.totalCount,
        created_at: result.user.createdAt,
        updated_at: result.user.updatedAt,
        avatar_url: result.user.avatarUrl,
        html_url: result.user.url,
        site_admin: result.user.isSiteAdmin,
        contributed_repositories: result.user.repositoriesContributedTo.totalCount,
        starred_repositories: result.user.starredRepositories.totalCount,
        organizations: result.user.organizations.nodes.map((org) => ({
          login: org.login,
          name: org.name
        }))
      };
      
      console.log('GraphQL user data:');
      console.log(JSON.stringify(userData, null, 2));
      
      // Now fetch with REST API for comparison
      console.time('REST API request');
      const restResponse = await octokit.rest.users.getByUsername({ username });
      console.timeEnd('REST API request');
      
      console.log('\nREST API user data:');
      console.log(JSON.stringify(restResponse.data, null, 2));
    } else {
      console.error('No user data returned from GraphQL query');
    }
  } catch (error) {
    console.error(`GraphQL request failed: ${error instanceof Error ? error.message : String(error)}`);
    
    if (error.errors) {
      console.error('GraphQL errors:', error.errors);
    }
    
    // Try REST API as fallback
    try {
      console.log('\nFalling back to REST API...');
      const response = await octokit.rest.users.getByUsername({ username });
      console.log('REST API user data:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (restError) {
      console.error(`REST API request also failed: ${restError instanceof Error ? restError.message : String(restError)}`);
    }
  }
}

// Run the test
testGraphQLUserData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});