import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { Db, DbManager } from '../db/index.js';
import { GitHubApiClient } from '@dfb/octokit';
import {
  GitHubContributorEntity,
  GitHubContributorIssuePrEntity,
  GitHubRepositoryEntity,
  GitHubWorkflowEntity,
} from '@dfb/db';
/**
 * Configuration data class that provides access to repository and contributor information
 */
export default class DataConfig {
  public dataDirectory: string;
  public generatedDirectory: string;
  public _microsoftContributors: string[] | null = null;
  public db: DbManager;
  public gitHubToken: string | null = null;
  public githubClient: GitHubApiClient | null = null;
  public authenticatedUserLogin: string | null = null;

  public contributors: Set<GitHubContributorEntity> | null = new Set();
  public issues: Set<GitHubContributorIssuePrEntity> | null = new Set();
  public repositories: Set<GitHubRepositoryEntity> | null = new Set();
  public workflows: Set<GitHubWorkflowEntity> | null = new Set();

  constructor(dataDirectory: string, generatedDirectory: string) {
    this.dataDirectory = dataDirectory;
    this.generatedDirectory = generatedDirectory;
    this.gitHubToken = process.env.GITHUB_TOKEN || null;
  }
  public async init() {
    const db = new Db();
    const dbManager = await db.connect(this.generatedDirectory);
    this.db = dbManager;

    this.gitHubToken = process.env.GITHUB_TOKEN || null;
    if (!this.gitHubToken || this.gitHubToken.length < 10) {
      logger.error(
        'GitHub token is missing or invalid. Please set GITHUB_TOKEN in your environment variables.'
      );
      process.exit(1);
    }

    this.githubClient = new GitHubApiClient(this.gitHubToken);
    const result = await this.githubClient.getAndTestGitHubToken();
    this.authenticatedUserLogin = result.login;

    logger.info('Starting health check ...');
    logger.info('Data directory: %s', this.dataDirectory);
    logger.info('Generated directory: %s', this.generatedDirectory);
    logger.info('***    Authenticated*** as: %s', this.authenticatedUserLogin);
  }
  public get microsoftContributors(): string[] {
    logger.info(`Getting Microsoft contributors`);
    if (!this._microsoftContributors) {
      logger.info(`Loading Microsoft contributors from file`);
      const filePath = path.join(
        this.dataDirectory,
        process.env.CONTRIBUTOR_LIST_FILE || 'advocates.json'
      );
      logger.info(`Loading Microsoft contributors from ${filePath}`);
      const peopleInfo: [] = this.readJsonFile(filePath);
      logger.info(`Found ${peopleInfo.length} total contributors in the list`);

      // remove all nulls from the array
      this._microsoftContributors = peopleInfo
        .map((x: any) => x.github)
        .filter(
          (github: string | null | undefined) =>
            typeof github === 'string' && github.trim() !== ''
        );
    }
    return this._microsoftContributors || [];
  }
  public get generatedDirectoryName(): string {
    return this.generatedDirectory;
  }

  public get dataDirectoryName(): string {
    return this.dataDirectory;
  }

  private readJsonFile<T>(filePath: string): T {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(
        `Failed to read/parse ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
