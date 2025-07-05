// src/github2/mappers.ts
import {
  OctokitWorkflow,
  OctokitUser,
  OctokitRepo,
  OctokitIssue,
  OctokitPR,
  OctokitDependabotAlert,
} from './models.js';
import { Workflow as WorkflowEntity } from '@dfb/db';
import { Contributor } from '@dfb/db';
import { Repository as RepositoryEntity } from '@dfb/db';
import { ContributorIssuePr } from '@dfb/db';
import { DependabotAlert as DependabotAlertEntity } from '@dfb/db';

export function mapOctokitWorkflowToEntity(
  wf: OctokitWorkflow,
  orgRepo: string,
  lastRun?: {
    id?: string | number;
    status?: string;
    created_at?: string;
    url?: string;
  }
): Partial<WorkflowEntity> {
  return {
    id: wf.id, // keep as number if that's what your entity expects
    orgRepo,
    name: wf.name,
    path: wf.path,
    state: wf.state,
    created_at: wf.created_at ?? undefined,
    updated_at: wf.updated_at ?? undefined,
    url: wf.html_url ?? undefined,
    lastRunId: lastRun?.id ? String(lastRun.id) : undefined,
    lastRunStatus: lastRun?.status ?? undefined,
    lastRunDate: lastRun?.created_at ?? undefined,
    lastRunUrl: lastRun?.url ?? undefined,
  };
}

// Map OctokitUser to Contributor entity
export function mapOctokitUserToEntity(user: OctokitUser): Contributor {
  return {
    id: user.login,
    name: user.name ?? undefined,
    company: user.company ?? undefined,
    blog: user.blog ?? undefined,
    location: user.location ?? undefined,
    email: user.email ?? undefined,
    bio: user.bio ?? undefined,
    twitter: user.twitter_username ?? undefined,
    followers: user.followers ?? 0,
    following: user.following ?? 0,
    public_repos: user.public_repos ?? 0,
    public_gists: user.public_gists ?? 0,
    avatar_url: user.avatar_url ?? undefined,
    last_updated: user.updated_at ? new Date(user.updated_at) : undefined,
  };
}

export function mapOctokitRepoToEntity(repo: OctokitRepo): RepositoryEntity {
  return {
    id: repo.node_id,
    name: repo.name,
    nameWithOwner: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? undefined,
    stargazerCount: repo.stargazers_count ?? undefined,
    forkCount: repo.forks_count ?? undefined,
    isPrivate: repo.private ?? undefined,
    isFork: repo.fork ?? undefined,
    isArchived: repo.archived ?? undefined,
    isDisabled: repo.disabled ?? undefined,
    primaryLanguage: repo.language ?? undefined,
    licenseInfo: repo.license?.name ?? undefined,
    diskUsage: repo.size ?? undefined,
    createdAt: repo.created_at ?? undefined,
    updatedAt: repo.updated_at ?? undefined,
    pushedAt: repo.pushed_at ?? undefined,
    owner: repo.owner?.login ?? undefined,
    watchersCount: repo.watchers_count ?? undefined,
    //issuesCount: repo.open_issues_count ?? undefined,
    //pullRequestsCount: undefined, // Not available directly
    topics: Array.isArray(repo.topics) ? repo.topics.join(',') : undefined,
    readme: undefined, // Not available directly
  };
}

export function mapOctokitIssueToEntity(
  issue: OctokitIssue,
  username: string
): ContributorIssuePr {
  return {
    username,
    type: 'issue',
    id: String(issue.id),
    number: issue.number,
    title: issue.title ?? undefined,
    url: issue.html_url ?? undefined,
    org: issue.repository_url?.split('/')[4] ?? undefined,
    repo: issue.repository_url?.split('/')[5] ?? undefined,
    state: issue.state ?? undefined,
    createdAt: issue.created_at ?? undefined,
    updatedAt: issue.updated_at ?? undefined,
    closedAt: issue.closed_at ?? undefined,
    mergedAt: undefined,
    merged: undefined,
  };
}

// Type guard for PRs with merged/merged_at
function hasMergedFields(
  pr: OctokitPR
): pr is OctokitPR & { merged: boolean; merged_at: string } {
  return 'merged' in pr && 'merged_at' in pr;
}

export function mapOctokitPRToEntity(
  pr: OctokitPR,
  username: string
): ContributorIssuePr {
  return {
    username,
    type: 'pr',
    id: String(pr.id),
    number: pr.number,
    title: pr.title ?? undefined,
    url: pr.html_url ?? undefined,
    org: pr.base?.repo?.owner?.login ?? undefined,
    repo: pr.base?.repo?.name ?? undefined,
    state: pr.state ?? undefined,
    createdAt: pr.created_at ?? undefined,
    updatedAt: pr.updated_at ?? undefined,
    closedAt: pr.closed_at ?? undefined,
    mergedAt: hasMergedFields(pr) ? (pr.merged_at ?? undefined) : undefined,
    merged: hasMergedFields(pr) ? (pr.merged ?? undefined) : undefined,
  };
}

export function mapOctokitDependabotAlertToEntity(
  alert: OctokitDependabotAlert,
  repo: string
): Partial<DependabotAlertEntity> {
  return {
    id: alert.number,
    repo,
    state: alert.state,
    dependency_name: alert.dependency?.package?.name ?? '',
    dependency_ecosystem: alert.dependency?.package?.ecosystem ?? '',
    manifest_path: alert.dependency?.manifest_path ?? undefined,
    severity:
      alert.security_advisory?.severity ??
      alert.security_vulnerability?.severity ??
      undefined,
    summary: alert.security_advisory?.summary ?? undefined,
    cve_id: alert.security_advisory?.cve_id ?? undefined,
    ghsa_id: alert.security_advisory?.ghsa_id ?? undefined,
    vulnerable_version_range:
      alert.security_vulnerability?.vulnerable_version_range ?? undefined,
    first_patched_version:
      alert.security_vulnerability?.first_patched_version?.identifier ??
      undefined,
    created_at: alert.created_at,
    updated_at: alert.updated_at,
    fixed_at: alert.fixed_at ?? undefined,
    dismissed_at: alert.dismissed_at ?? undefined,
    html_url: alert.html_url ?? undefined,
    cvss_score: alert.security_advisory?.cvss?.score ?? undefined,
    cvss_vector: alert.security_advisory?.cvss?.vector_string ?? undefined,
  };
}
