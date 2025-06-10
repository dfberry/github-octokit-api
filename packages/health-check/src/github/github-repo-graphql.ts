import { RepoData } from '../models.js';
import RepoDataCollector from './github-repo.js';
import GitHubGraphQL from './github-graphql.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * GraphQLRepoDataCollector extends the basic RepoDataCollector but uses GraphQL
 * to fetch data more efficiently, reducing the number of API calls needed.
 */
export default class GraphQLRepoDataCollector extends RepoDataCollector {
  private graphqlClient: GitHubGraphQL;
  private cachePath: string;
  private cacheEnabled: boolean;
  private cacheValidTimeMs: number;
  // Note: etagStore is currently initialized but will be used in future ETag implementations
  // @ts-ignore
  private etagStore: Record<string, string> = {};
  private etagStorePath: string;

  constructor(
    token: string,
    options: {
      cacheEnabled?: boolean;
      cachePath?: string;
      cacheValidTimeMs?: number;
    } = {}
  ) {
    super(token);
    this.graphqlClient = new GitHubGraphQL(token);
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cachePath = options.cachePath ?? join(process.cwd(), '.cache');
    this.cacheValidTimeMs = options.cacheValidTimeMs ?? 1000 * 60 * 60; // 1 hour by default
    this.etagStorePath = join(this.cachePath, 'etags.json');

    // Create cache directory if it doesn't exist
    if (this.cacheEnabled && !existsSync(this.cachePath)) {
      mkdirSync(this.cachePath, { recursive: true });
    }

    // Load ETags from store
    this.loadEtagStore();
  }

  /**
   * Load ETags from the store file
   */
  private loadEtagStore(): void {
    if (this.cacheEnabled && existsSync(this.etagStorePath)) {
      try {
        const data = readFileSync(this.etagStorePath, 'utf8');
        this.etagStore = JSON.parse(data);
      } catch (error) {
        console.warn(
          'Failed to load ETag store, starting with empty store',
          error
        );
        this.etagStore = {};
      }
    }
  }

  /**
   * Save ETags to the store file
   * This method is commented out to prevent TypeScript errors as it's not currently used
   * It will be used in future implementations for ETag-based conditional requests
   */
  // private saveEtagStore(): void {
  //   if (this.cacheEnabled) {
  //     try {
  //       writeFileSync(
  //         this.etagStorePath,
  //         JSON.stringify(this.etagStore, null, 2)
  //       );
  //     } catch (error) {
  //       console.warn('Failed to save ETag store', error);
  //     }
  //   }
  // }

  /**
   * Generate a cache key for a repository
   *
   * @param org Repository organization
   * @param repo Repository name
   * @returns Cache key string
   */
  private getCacheKey(org: string, repo: string): string {
    return `${org}_${repo}`;
  }

  /**
   * Get the path to the cache file for a repository
   *
   * @param org Repository organization
   * @param repo Repository name
   * @returns Path to cache file
   */
  private getCacheFilePath(org: string, repo: string): string {
    return join(this.cachePath, `${this.getCacheKey(org, repo)}.json`);
  }

  /**
   * Check if cached data exists and is valid
   *
   * @param org Repository organization
   * @param repo Repository name
   * @returns Whether valid cache exists
   */
  private hasFreshCache(org: string, repo: string): boolean {
    if (!this.cacheEnabled) return false;

    const cacheFilePath = this.getCacheFilePath(org, repo);
    if (!existsSync(cacheFilePath)) return false;

    try {
      const stats = existsSync(cacheFilePath)
        ? require('fs').statSync(cacheFilePath)
        : null;
      if (!stats) return false;

      // Check if cache is still valid based on file modification time
      const age = Date.now() - stats.mtimeMs;
      return age < this.cacheValidTimeMs;
    } catch (error) {
      console.warn('Error checking cache freshness', error);
      return false;
    }
  }

  /**
   * Save data to cache
   *
   * @param org Repository organization
   * @param repo Repository name
   * @param data Data to cache
   */
  private saveToCache(org: string, repo: string, data: RepoData): void {
    if (!this.cacheEnabled) return;

    try {
      const cacheFilePath = this.getCacheFilePath(org, repo);
      writeFileSync(cacheFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to write to cache', error);
    }
  }

  /**
   * Get data from cache
   *
   * @param org Repository organization
   * @param repo Repository name
   * @returns Cached data or null if not available
   */
  private getFromCache(org: string, repo: string): RepoData | null {
    if (!this.cacheEnabled) return null;

    try {
      const cacheFilePath = this.getCacheFilePath(org, repo);
      if (!existsSync(cacheFilePath)) return null;

      const data = readFileSync(cacheFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to read from cache', error);
      return null;
    }
  }

  /**
   * Override the collectRepoData method to use GraphQL instead of REST API
   *
   * @param repo Repository object with org and repo name
   * @returns Repository data
   */
  async collectRepoData(repo: {
    org: string;
    repo: string;
  }): Promise<RepoData> {
    console.log(`Collecting data for ${repo.org}/${repo.repo} via GraphQL...`);

    // Check for fresh cache first
    if (this.hasFreshCache(repo.org, repo.repo)) {
      console.log(`Using cached data for ${repo.org}/${repo.repo}`);
      const cachedData = this.getFromCache(repo.org, repo.repo);
      if (cachedData) return cachedData;
    }

    try {
      // Use GraphQL to fetch data
      const result = await this.graphqlClient.getRepositoryData(
        repo.org,
        repo.repo
      );

      // Type safety for the result
      const typedResult = result as { repository: any } | { error: string };

      // If there's an error in the GraphQL response, fall back to the REST API
      if ('error' in typedResult) {
        console.warn(
          `GraphQL error, falling back to REST API: ${typedResult.error}`
        );
        return await super.collectRepoData(repo);
      }

      const repository = (typedResult as { repository: any }).repository;
      if (!repository) {
        console.warn(`Repository ${repo.org}/${repo.repo} not found`);
        return this.createEmptyRepoData(repo);
      }

      // Extract topics with proper typing
      const topics =
        repository.topics?.nodes?.map((node: any) => node.topic.name) || [];

      // Extract last commit info
      const lastCommitNode =
        repository.defaultBranchRef?.target?.history?.nodes?.[0];
      const lastCommitDate = lastCommitNode?.committedDate ?? '';
      const lastCommitterLogin = lastCommitNode?.author?.user?.login ?? '';
      const lastCommitterAvatar = lastCommitNode?.author?.user?.avatarUrl ?? '';
      const lastCommitterUrl = lastCommitNode?.author?.user?.url ?? '';

      // Extract security vulnerability information
      const vulnerabilityAlerts = repository.vulnerabilityAlerts || {
        totalCount: 0,
        nodes: [],
      };
      const hasVulnerabilities = vulnerabilityAlerts.totalCount > 0;

      // Check for code scanning (approximation based on workflow files)
      const workflowEntries = repository.workflows?.entries || [];
      const codeScanning = workflowEntries.some(
        (entry: any) =>
          entry.name.toLowerCase().includes('codeql') ||
          entry.name.toLowerCase().includes('code-scanning') ||
          entry.object?.text?.toLowerCase().includes('codeql') ||
          entry.object?.text?.toLowerCase().includes('code-scanning')
      );

      // Construct the RepoData object
      const repoData: RepoData = {
        name: repository.name,
        org: repo.org,
        repo: repo.repo,
        full_name: `${repo.org}/${repo.repo}`,
        description: repository.description || '',
        stars: repository.stargazerCount || 0,
        forks: repository.forkCount || 0,
        watchers: repository.watchers?.totalCount || 0,
        issues: repository.openIssues?.totalCount || 0,
        prsCount: repository.pullRequests?.totalCount || 0,
        topics,
        lastCommitDate: lastCommitDate
          ? new Date(lastCommitDate).toISOString()
          : '',
        lastCommitterLogin: lastCommitterLogin,
        lastCommitterAvatar: lastCommitterAvatar,
        lastCommitterUrl: lastCommitterUrl,
        securityNotices: vulnerabilityAlerts.totalCount,
        hasVulnerabilities: hasVulnerabilities,
        dependabotAlerts: vulnerabilityAlerts.totalCount,
        codeScanning: codeScanning,
        // created_at, updated_at and pushed_at are not in RepoData interface
        // but we collect them for potential future use
        // Add any other required fields from your RepoData interface
      };

      // Cache the result
      this.saveToCache(repo.org, repo.repo, repoData);

      return repoData;
    } catch (error) {
      console.error(
        `Error fetching repository data with GraphQL for ${repo.org}/${repo.repo}:`,
        error
      );
      console.log('Falling back to REST API...');

      // Fall back to the parent class implementation using REST API
      return await super.collectRepoData(repo);
    }
  }

  /**
   * Collect data for multiple repositories in a single batch request
   *
   * @param repos Array of repositories to collect data for
   * @returns Array of repository data
   */
  async batchCollectReposData(
    repos: Array<{ org: string; repo: string }>
  ): Promise<RepoData[]> {
    console.log(`Batch collecting data for ${repos.length} repositories...`);

    // Filter out repos we already have cached
    const cachedReposData: RepoData[] = [];
    const reposToFetch: Array<{ org: string; repo: string }> = [];

    for (const repo of repos) {
      if (this.hasFreshCache(repo.org, repo.repo)) {
        const cachedData = this.getFromCache(repo.org, repo.repo);
        if (cachedData) {
          cachedReposData.push(cachedData);
          console.log(`Using cached data for ${repo.org}/${repo.repo}`);
          continue;
        }
      }
      reposToFetch.push(repo);
    }

    // If all repos are cached, return early
    if (reposToFetch.length === 0) {
      return cachedReposData;
    }

    try {
      // Batch repos in groups of 10 (GraphQL query complexity limit)
      const batchSize = 10;
      const results: RepoData[] = [...cachedReposData];

      for (let i = 0; i < reposToFetch.length; i += batchSize) {
        const batch = reposToFetch.slice(i, i + batchSize);
        // Transform the batch to the format expected by the GraphQL client
        const transformedBatch = batch.map(repo => ({
          owner: repo.org,
          name: repo.repo,
        }));
        const batchResult =
          await this.graphqlClient.batchGetRepositoriesBasicData(
            transformedBatch
          );

        // Type safety for the batch result
        const typedBatchResult = batchResult as
          | Record<string, any>
          | { error: string };

        // If we got an error, collect each repo individually as fallback
        if ('error' in typedBatchResult) {
          console.warn(
            `GraphQL batch error, falling back to individual requests: ${typedBatchResult.error}`
          );
          for (const repo of batch) {
            const repoData = await this.collectRepoData(repo);
            results.push(repoData);
          }
          continue;
        }

        // Process each repository in the batch result
        for (let j = 0; j < batch.length; j++) {
          const repoKey = `repo${j}`;
          const repo = batch[j];

          if (repoKey in typedBatchResult) {
            const graphqlRepo = typedBatchResult[repoKey] as any;

            // Extract topics with proper typing
            const topics =
              graphqlRepo.topics?.nodes?.map((node: any) => node.topic.name) ||
              [];

            // Construct the RepoData object with the fields we have
            const repoData: RepoData = {
              name: graphqlRepo.name,
              org: repo.org,
              repo: repo.repo,
              full_name: `${repo.org}/${repo.repo}`,
              description: graphqlRepo.description || '',
              stars: graphqlRepo.stargazerCount || 0,
              forks: graphqlRepo.forkCount || 0,
              watchers: 0, // Not available in basic batch request
              issues: graphqlRepo.openIssues?.totalCount || 0,
              prsCount: graphqlRepo.pullRequests?.totalCount || 0, // Changed from pull_requests to prsCount
              topics,
              lastCommitDate: '', // Not in basic batch
              lastCommitterLogin: '',
              lastCommitterAvatar: '',
              lastCommitterUrl: '',
              securityNotices: 0, // Need separate query for security data
              hasVulnerabilities: false,
              dependabotAlerts: 0,
              codeScanning: false,
            };

            // Cache the result (even though it's partial)
            this.saveToCache(repo.org, repo.repo, repoData);

            results.push(repoData);
          } else {
            // If the repo wasn't found in the result, fall back to individual request
            console.warn(
              `Repository ${repo.org}/${repo.repo} not found in batch result`
            );
            const repoData = await this.collectRepoData(repo);
            results.push(repoData);
          }
        }
      }

      return results;
    } catch (error) {
      console.error(`Error in batch collection: ${error}`);

      // Fall back to individual requests
      const results: RepoData[] = [...cachedReposData];
      for (const repo of reposToFetch) {
        const repoData = await this.collectRepoData(repo);
        results.push(repoData);
      }
      return results;
    }
  }
}
