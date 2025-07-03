import type { GitHubRepository } from '../models.js';
import type { Repository as DatabaseRepository } from '../typeorm/Repository.js';
import { GitHubRepoModified } from '../github2/repository-service.js';
import type {
  ContributorRepo,
  OctokitRepo,
  OctokitSearchRepo,
} from '../github2/models.js';

/**
 * Normalize a GitHubRepository (GraphQL) to a TypeORM Repository entity shape.
 */
export function normalizeGitHubRepositoryToDatabaseRepository(
  repo: GitHubRepoModified
): Partial<DatabaseRepository> {
  return {
    id: repo.id?.toString() ?? '',
    name: repo.name || '',
    nameWithOwner: repo.nameWithOwner || '',
    url: repo.url || '',
    description: repo.description || '',
    stargazerCount: repo.stargazerCount ?? 0,
    forkCount: repo.forkCount ?? 0,
    isPrivate: repo.isPrivate ?? false,
    isFork: repo.isFork ?? false,
    isArchived: repo.isArchived ?? false,
    isDisabled: repo.isDisabled ?? false,
    primaryLanguage: repo.primaryLanguage?.name ?? undefined,
    licenseInfo: repo.licenseInfo?.name ?? undefined,
    owner: repo.owner?.login ?? '',
    diskUsage: repo.diskUsage ?? undefined,
    createdAt: repo.createdAt ?? undefined,
    updatedAt: repo.updatedAt ?? undefined,
    pushedAt: repo.pushedAt ?? undefined,
    watchersCount: repo.watchers?.totalCount ?? undefined,
    issuesCount: repo.issues.totalCount ?? 0,
    pullRequestsCount: repo.pullRequests.totalCount ?? 0,
    topics: repo.topics.nodes.map(t => t.topic?.name).join(',') || undefined,
    readme: normalizeReadme(repo?.readme?.text),
  };
}
// Utility functions for normalizing GitHub API data structures

// Helper types for topic nodes
interface TopicNode {
  topic?: { name?: string };
}
interface TopicsObject {
  nodes: TopicNode[];
}

export function normalizeTopics(
  topics: TopicsObject | { name?: string }[] | string[] | string | undefined
): string | undefined {
  if (Array.isArray(topics)) {
    if (
      topics.length > 0 &&
      typeof topics[0] === 'object' &&
      topics[0] !== null &&
      'name' in topics[0]
    ) {
      return (topics as { name?: string }[])
        .map(t => t.name)
        .filter(Boolean)
        .join(',');
    }
    return (topics as string[]).join(',');
  } else if (typeof topics === 'string') {
    return topics;
  } else if (
    topics &&
    typeof topics === 'object' &&
    Array.isArray((topics as TopicsObject).nodes)
  ) {
    return (topics as TopicsObject).nodes
      .map(n => n?.topic?.name)
      .filter(Boolean)
      .join(',');
  }
  return undefined;
}

export function normalizeReadme(
  readme: { text?: string } | string | null | undefined
): string | undefined {
  if (readme && typeof readme === 'object' && 'text' in readme) {
    return readme.text;
  } else if (typeof readme === 'string') {
    return readme;
  }
  return undefined;
}

// Normalized repo object type
export type NormalizedRepo = {
  id: string;
  name: string;
  nameWithOwner: string;
  url: string;
  description: string;
  stargazerCount: number;
  forkCount: number;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  isDisabled: boolean;
  primaryLanguage?: string;
  licenseInfo?: string;
  owner: string;
  diskUsage?: number;
  createdAt?: string;
  updatedAt?: string;
  pushedAt?: string;
  watchersCount?: number;
  issuesCount?: number;
  pullRequestsCount?: number;
  topics?: string;
  readme?: string | null;
};

// Type guards for GraphQL and REST repo shapes

// Accepts both GraphQL-like and REST repo objects
function isGraphQLRepo(obj: unknown): obj is {
  id: string | number;
  name: string;
  nameWithOwner: string;
  url: string;
  description?: string;
  stargazerCount?: number;
  forkCount?: number;
  isPrivate?: boolean;
  isFork?: boolean;
  isArchived?: boolean;
  isDisabled?: boolean;
  primaryLanguage?: { name: string } | string | null;
  licenseInfo?: { name: string } | string | null;
  owner: { login: string } | string;
  diskUsage?: number;
  createdAt?: string;
  updatedAt?: string;
  pushedAt?: string;
  watchers?: { totalCount: number };
  issues?: { totalCount: number };
  pullRequests?: { totalCount: number };
  repositoryTopics?: { nodes: { topic?: { name?: string } }[] };
  topics?: string[] | string;
  readme?: { text?: string } | string | null;
} {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'nameWithOwner' in obj &&
    typeof (obj as { nameWithOwner?: unknown }).nameWithOwner === 'string'
  );
}

function isRestRepo(obj: unknown): obj is {
  id: string | number;
  node_id?: string;
  name: string;
  full_name: string;
  html_url: string;
  description?: string;
  stargazers_count?: number;
  forks_count?: number;
  private?: boolean;
  fork?: boolean;
  archived?: boolean;
  disabled?: boolean;
  language?: string | null;
  license?: { name: string } | null;
  owner: { login: string } | string;
  disk_usage?: number;
  created_at?: string;
  updated_at?: string;
  pushed_at?: string;
  watchers_count?: number;
  open_issues_count?: number;
  topics?: string[] | string;
} {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'full_name' in obj &&
    typeof (obj as { full_name?: unknown }).full_name === 'string'
  );
}

export function normalizeRepo(
  repoObjRaw: ContributorRepo
): NormalizedRepo | undefined {
  if (isGraphQLRepo(repoObjRaw)) {
    // GraphQL-like shape
    return {
      id: repoObjRaw.id?.toString() ?? '',
      name: repoObjRaw.name || '',
      nameWithOwner: repoObjRaw.nameWithOwner,
      url: repoObjRaw.url || '',
      description: repoObjRaw.description || '',
      stargazerCount: repoObjRaw.stargazerCount ?? 0,
      forkCount: repoObjRaw.forkCount ?? 0,
      isPrivate: repoObjRaw.isPrivate ?? false,
      isFork: repoObjRaw.isFork ?? false,
      isArchived: repoObjRaw.isArchived ?? false,
      isDisabled: repoObjRaw.isDisabled ?? false,
      primaryLanguage:
        typeof repoObjRaw.primaryLanguage === 'string'
          ? repoObjRaw.primaryLanguage || undefined
          : repoObjRaw.primaryLanguage?.name || undefined,
      licenseInfo:
        typeof repoObjRaw.licenseInfo === 'string'
          ? repoObjRaw.licenseInfo || undefined
          : repoObjRaw.licenseInfo?.name || undefined,
      owner:
        typeof repoObjRaw.owner === 'string'
          ? repoObjRaw.owner
          : (repoObjRaw.owner?.login ?? ''),
      diskUsage: repoObjRaw.diskUsage ?? undefined,
      createdAt: repoObjRaw.createdAt ?? undefined,
      updatedAt: repoObjRaw.updatedAt ?? undefined,
      pushedAt: repoObjRaw.pushedAt ?? undefined,
      watchersCount: repoObjRaw.watchers?.totalCount ?? undefined,
      issuesCount: repoObjRaw.issues?.totalCount ?? undefined,
      pullRequestsCount: repoObjRaw.pullRequests?.totalCount ?? undefined,
      topics: normalizeTopics(repoObjRaw.repositoryTopics ?? repoObjRaw.topics),
      readme: normalizeReadme(repoObjRaw.readme),
    };
  } else if (isRestRepo(repoObjRaw)) {
    // REST shape
    return {
      id: repoObjRaw.id?.toString() ?? repoObjRaw.node_id ?? '',
      name: repoObjRaw.name || '',
      nameWithOwner: repoObjRaw.full_name || '',
      url: repoObjRaw.html_url || '',
      description: repoObjRaw.description || '',
      stargazerCount: repoObjRaw.stargazers_count ?? 0,
      forkCount: repoObjRaw.forks_count ?? 0,
      isPrivate: repoObjRaw.private ?? false,
      isFork: repoObjRaw.fork ?? false,
      isArchived: repoObjRaw.archived ?? false,
      isDisabled: repoObjRaw.disabled ?? false,
      primaryLanguage: repoObjRaw.language || undefined,
      licenseInfo: repoObjRaw.license?.name || undefined,
      owner:
        typeof repoObjRaw.owner === 'string'
          ? repoObjRaw.owner
          : (repoObjRaw.owner?.login ?? ''),
      diskUsage: repoObjRaw.disk_usage ?? undefined,
      createdAt: repoObjRaw.created_at ?? undefined,
      updatedAt: repoObjRaw.updated_at ?? undefined,
      pushedAt: repoObjRaw.pushed_at ?? undefined,
      watchersCount: repoObjRaw.watchers_count ?? undefined,
      issuesCount: repoObjRaw.open_issues_count ?? undefined,
      pullRequestsCount: undefined, // REST API does not provide this directly
      topics: normalizeTopics(repoObjRaw.topics),
      readme: undefined, // REST API does not provide this directly
    };
  }
  return undefined;
}
