import fs from 'fs';
import path from 'path';
import logger from './logger.js';

/**
 * Configuration data class that provides access to repository and contributor information
 */
export default class DataConfig {
  private dataDirectory: string;
  private generatedDirectory: string;
  private _microsoftRepos: string[] | null = null;
  private _microsoftOrgs: string[] | null = null;
  private _microsoftLanguages: string[] | null = null;
  private _microsoftTopics: string[] | null = null;
  private _microsoftContributors: string[] | null = null;
  private _activeRepos: Array<{ org: string; repo: string }> | null = null;

  constructor(dataDirectory: string, generatedDirectory: string) {
    this.dataDirectory = dataDirectory;
    this.generatedDirectory = generatedDirectory;
  }

  // Add getter for activeRepos
  public get activeRepos(): Array<{ org: string; repo: string }> {
    if (!this._activeRepos) {
      const filePath = path.join(this.dataDirectory, 'active-repos.json');
      try {
        this._activeRepos =
          this.readJsonFile<Array<{ org: string; repo: string }>>(filePath);
        logger.info(
          `Loaded ${this._activeRepos.length} repositories from active repos list`
        );
      } catch (error) {
        logger.error(
          `Error reading active-repos.json: ${error instanceof Error ? error.message : String(error)}`
        );
        // Fallback to an empty array
        this._activeRepos = [];
      }
    }
    return this._activeRepos;
  }

  public get microsoftRepos(): string[] {
    if (!this._microsoftRepos) {
      const filePath = path.join(this.dataDirectory, 'microsoft-repos.json');
      try {
        this._microsoftRepos = this.readJsonFile<string[]>(filePath);
        logger.info(
          `Loaded ${this._microsoftRepos.length} repositories from complete list`
        );
      } catch (error) {
        logger.error(
          `Error reading microsoft-repos.json: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    }
    return this._microsoftRepos;
  }

  public get microsoftOrgs(): string[] {
    if (this._microsoftOrgs === null) {
      const filePath = path.join(this.dataDirectory, 'microsoft-orgs.json');
      this._microsoftOrgs = this.readJsonFile(filePath);
    }
    return this._microsoftOrgs || [];
  }

  public get microsoftLanguages(): string[] {
    if (!this._microsoftLanguages) {
      const filePath = path.join(
        this.dataDirectory,
        'microsoft-languages.json'
      );
      this._microsoftLanguages = this.readJsonFile(filePath);
    }
    return this._microsoftLanguages || [];
  }

  public get microsoftTopics(): string[] {
    if (!this._microsoftTopics) {
      const filePath = path.join(this.dataDirectory, 'microsoft-topics.json');
      this._microsoftTopics = this.readJsonFile(filePath);
    }
    return this._microsoftTopics || [];
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

  /**
   * Get Microsoft repositories from JSON file
   * @returns Array of Microsoft repository URLs
   */
  public getMicrosoftRepos(): string[] {
    // First try to load active-repos.json if it exists
    const activeReposPath = path.join(this.dataDirectory, 'active-repos.json');
    try {
      if (fs.existsSync(activeReposPath)) {
        const data =
          this.readJsonFile<{ org: string; repo: string }[]>(activeReposPath);
        logger.info(
          `Using filtered list of ${data.length} active repositories`
        );
        return data.map(r => `${r.org}/${r.repo}`);
      }
    } catch (error) {
      logger.warn(
        `⚠️ Error reading active-repos.json: ${error instanceof Error ? error.message : String(error)}`
      );
      logger.info('Falling back to full repository list...');
    }

    // Fall back to microsoft-repos.json if no active repos list
    const filePath = path.join(this.dataDirectory, 'microsoft-repos.json');
    try {
      const data = this.readJsonFile<string[]>(filePath);
      logger.info(`Loaded ${data.length} repositories from full list`);
      return data;
    } catch (error) {
      logger.error(
        `❌ Error reading microsoft-repos.json: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
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
