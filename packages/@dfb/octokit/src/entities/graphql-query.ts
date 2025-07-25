// Generic GraphQL query utility for GitHub advanced issue/PR search
import { Octokit } from '@octokit/rest';

export interface GitHubGraphQLQueryOptions {
  token: string;
  query: string;
  queryParams?: Record<string, any>;
}

export async function githubGraphQLSearchIssues<T = any>({
  token,
  query,
  queryParams = {},
}: GitHubGraphQLQueryOptions): Promise<any> {
  const octokit = new Octokit({ auth: token });

  const response = await octokit.graphql(query, queryParams);

  console.log('GraphQL response:', response);

  return response;
}
