// src/github2/mappers.ts
import {
  OctokitWorkflow,
  OctokitUser,
  OctokitRepo,
  OctokitIssue,
  OctokitPR,
  OctokitDependabotAlert,
} from './models.js';
import {
  GitHubContributorEntity,
  GitHubContributorIssuePrEntity,
  GitHubDependabotAlertEntity,
  GitHubRepositoryEntity,
  GitHubWorkflowEntity,
} from '@dfb/db';
export function mapOctokitWorkflowToEntity(
  wf: OctokitWorkflow,
  orgRepo: string,
  lastRun?: {
    id?: string | number;
    status?: string;
    created_at?: string;
    url?: string;
  }
): Partial<GitHubWorkflowEntity> {
  return {
    id: wf.id, // keep as number if that's what your entity expects
    org_repo: orgRepo,
    name: wf.name,
    path: wf.path,
    state: wf.state,
    created_at: wf.created_at ?? undefined,
    updated_at: wf.updated_at ?? undefined,
    url: wf.html_url ?? undefined,
    last_run_id: lastRun?.id ? String(lastRun.id) : undefined,
    last_run_status: lastRun?.status ?? undefined,
    last_run_date: lastRun?.created_at ?? undefined,
    last_run_url: lastRun?.url ?? undefined,
  };
}

// Map OctokitUser to Contributor entity
export function mapOctokitUserToEntity(
  user: OctokitUser
): GitHubContributorEntity {
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

export function mapOctokitRepoToEntity(
  repo: OctokitRepo
): GitHubRepositoryEntity {
  return {
    id: repo.node_id,
    name: repo.name,
    name_with_owner: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? undefined,
    stargazer_count: repo.stargazers_count ?? undefined,
    fork_count: repo.forks_count ?? undefined,
    is_private: repo.private ?? undefined,
    is_fork: repo.fork ?? undefined,
    is_archived: repo.archived ?? undefined,
    is_disabled: repo.disabled ?? undefined,
    primary_language: repo.language ?? undefined,
    license_info: repo.license?.name ?? undefined,
    disk_usage: repo.size ?? undefined,
    created_at: repo.created_at ?? undefined,
    updated_at: repo.updated_at ?? undefined,
    pushed_at: repo.pushed_at ?? undefined,
    owner: repo.owner?.login ?? undefined,
    watchers_count: repo.watchers_count ?? undefined,
    //issues_count: repo.open_issues_count ?? undefined,
    //pull_requests_count: undefined, // Not available directly
    topics: Array.isArray(repo.topics) ? repo.topics.join(',') : undefined,
    readme: undefined, // Not available directly
  };
}

export function mapOctokitIssueToEntity(
  issue: OctokitIssue,
  username: string
): GitHubContributorIssuePrEntity {
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
    created_at: issue.created_at ?? undefined,
    updated_at: issue.updated_at ?? undefined,
    closed_at: issue.closed_at ?? undefined,
    merged_at: undefined,
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
): GitHubContributorIssuePrEntity {
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
    created_at: pr.created_at ?? undefined,
    updated_at: pr.updated_at ?? undefined,
    closed_at: pr.closed_at ?? undefined,
    merged_at: hasMergedFields(pr) ? (pr.merged_at ?? undefined) : undefined,
    merged: hasMergedFields(pr) ? (pr.merged ?? undefined) : undefined,
  };
}

export function mapOctokitDependabotAlertToEntity(
  alert: OctokitDependabotAlert,
  repo: string
): Partial<GitHubDependabotAlertEntity> {
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
