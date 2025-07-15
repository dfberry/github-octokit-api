// github2/models.ts
// Centralized types for all github2 service methods, using @octokit/types
import { RestEndpointMethodTypes } from '@octokit/rest';
import { Endpoints } from '@octokit/types';

// ContributorData is a custom shape, but its fields are derived from Octokit user and repo types
export type OctokitUser =
  Endpoints['GET /users/{username}']['response']['data'];
export type OctokitRepo =
  Endpoints['GET /repos/{owner}/{repo}']['response']['data'];
export type OctokitSearchRepo =
  Endpoints['GET /search/repositories']['response']['data']['items'][0];
export type OctokitPR =
  Endpoints['GET /repos/{owner}/{repo}/pulls']['response']['data'][0];
export type OctokitIssue =
  Endpoints['GET /repos/{owner}/{repo}/issues']['response']['data'][0];
export type OctokitSearchIssue =
  Endpoints['GET /search/issues']['response']['data']['items'][0];

export type OctokitSearchIssueRest =
  RestEndpointMethodTypes['search']['issuesAndPullRequests']['response']['data']['items'][0];

// Workflow and WorkflowRun types from REST queries
export type OctokitWorkflow =
  Endpoints['GET /repos/{owner}/{repo}/actions/workflows']['response']['data']['workflows'][0];
export type OctokitWorkflowRun =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs']['response']['data']['workflow_runs'][0];

export type ContributorRepo = OctokitRepo | OctokitSearchRepo;
export type PrSearchItem = OctokitSearchIssue;
export type Repository = OctokitRepo;
export type Workflow = OctokitWorkflow;
export type WorkflowRun = OctokitWorkflowRun;
export type WorkflowWithStatus = Workflow & {
  lastRunId: string | null;
  lastRunStatus: string | null;
  lastRunDate: string | null;
  lastRunUrl: string | null;
};

export type OctokitAuthenticatedUser =
  Endpoints['GET /user']['response']['data'];

export type OctokitDependabotAlert =
  Endpoints['GET /repos/{owner}/{repo}/dependabot/alerts']['response']['data'][0];

export type ContributorData = {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string;
  company: string;
  blog: string;
  location: string;
  twitter: string;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  found?: boolean;
  repos: ContributorRepo[];
  recentPRs: PrSearchItem[];
};

export interface GitHubRepoFromGraphQlModified {
  id: string;
  name: string;
  nameWithOwner: string;
  url: string;
  description?: string;
  stargazerCount: number;
  forkCount: number;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  isDisabled: boolean;
  primaryLanguage?: { name?: string };
  licenseInfo?: { name?: string };
  diskUsage?: number;
  createdAt?: string;
  updatedAt?: string;
  pushedAt?: string;
  owner: { login: string };
  watchers: { totalCount: number };
  topics: { nodes: { topic: { name: string } }[] };
  readme?: { text?: string };
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
}
