import fs from 'fs';
import path from 'path';

/**
 * Configuration object that contains data loaded from JSON files
 */
export interface DataConfig {
  generatedDirectoryName?: string;
  microsoftContributors: string[];
  microsoftOrgs: string[];
  microsoftRepos: string[];
  microsoftLanguages: string[];
  microsoftTopics: string[];
}

/**
 * Class responsible for initializing the application with data from JSON files
 */
export class DataInitializer {
  private dataDirectory: string;
  private generatedDirectory: string;

  /**
   * Initialize the DataInitializer
   * @param rootPath Optional path to the root directory containing the data folder
   */
  constructor(dataDirectory: string, generatedDirectory: string) {
    this.generatedDirectory = generatedDirectory;
    console.log(`Generated path set to: ${this.generatedDirectory}`);

    this.dataDirectory = dataDirectory;
    console.log(`Data path set to: ${this.dataDirectory}`);
  }

  private checkVars() {
    if (!this.dataDirectory) {
      throw new Error('Data directory is not set');
    }
    if (!this.generatedDirectory) {
      throw new Error('Generated directory is not set');
    }
  }
  private async createGeneratedDirectory(): Promise<string> {
    try {
      await fs.promises.access(this.generatedDirectory).catch(async () => {
        await fs.promises.mkdir(this.generatedDirectory, { recursive: true });
        console.log(`Created directory: ${this.generatedDirectory}`);
      });

      console.log(`Directory exists: ${this.generatedDirectory}`);
      return this.generatedDirectory;
    } catch (error) {
      console.error(
        `Error creating directory: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }
  public init() {
    this.checkVars();
    const generatedDir = this.createGeneratedDirectory();
    console.log(`Generated directory initialized: ${generatedDir}`);
  }

  /**
   * Read JSON data from a file
   * @param filePath Path to the JSON file
   * @returns Parsed JSON content
   */
  private readJsonFile<T>(filePath: string): T {
    try {
      console.log(`Reading JSON file: ${filePath}`);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      console.log(`Read ${fileContent.length} characters from ${filePath}`);
      return JSON.parse(fileContent) as T;
    } catch (error) {
      console.error(
        `Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get Microsoft contributors from JSON file
   * @returns Array of contributor GitHub usernames
   */
  public getMicrosoftContributors(): string[] {
    const filePath = path.join(
      this.dataDirectory,
      'microsoft-contributors.json'
    );
    try {
      const data = this.readJsonFile<string[]>(filePath);
      console.log(`Loaded ${data.length} contributors`);
      return data || [];
    } catch (error) {
      console.warn(
        `Couldn't load contributors: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get Microsoft organizations from JSON file
   * @returns Array of Microsoft GitHub organization names
   */
  public getMicrosoftOrgs(): string[] {
    const filePath = path.join(this.dataDirectory, 'microsoft-orgs.json');
    try {
      const data = this.readJsonFile<string[]>(filePath);
      console.log(`Loaded ${data.length} organizations`);
      return data || [];
    } catch (error) {
      console.warn(
        `Couldn't load organizations: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get Microsoft repositories from JSON file
   * @returns Array of Microsoft repository URLs
   */
  public getMicrosoftRepos(): string[] {
    const filePath = path.join(this.dataDirectory, 'microsoft-repos.json');
    try {
      const data = this.readJsonFile<string[]>(filePath);
      console.log(`Loaded ${data.length} repositories`);
      return data || [];
    } catch (error) {
      console.warn(
        `Couldn't load repositories: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  public getMicrosoftLanguages(): string[] {
    const filePath = path.join(this.dataDirectory, 'microsoft-languages.json');
    try {
      const data = this.readJsonFile<string[]>(filePath);
      console.log(`Loaded ${data.length} languages`);
      return data || [];
    } catch (error) {
      console.warn(
        `Couldn't load languages: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  public getMicrosoftTopics(): string[] {
    const filePath = path.join(this.dataDirectory, 'microsoft-topics.json');
    try {
      const data = this.readJsonFile<string[]>(filePath);
      console.log(`Loaded ${data.length} topics`);
      return data || [];
    } catch (error) {
      console.warn(
        `Couldn't load topics: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Load all configuration data from JSON files
   * @returns DataConfig object containing all loaded data
   */
  public loadAllData(): DataConfig {
    return {
      microsoftContributors: this.getMicrosoftContributors(),
      microsoftOrgs: this.getMicrosoftOrgs(),
      microsoftRepos: this.getMicrosoftRepos(),
      microsoftLanguages: this.getMicrosoftLanguages(),
      microsoftTopics: this.getMicrosoftTopics(),
      generatedDirectoryName: this.generatedDirectory,
    };
  }
}

/**
 * Helper function to get a DataInitializer instance with default settings
 * @returns DataConfig object with all data loaded
 */
export function getConfigData(
  dataDirectory: string,
  generatedDirectory: string
): DataConfig {
  const initializer = new DataInitializer(dataDirectory, generatedDirectory);

  initializer.init();
  console.log(
    `DataInitializer initialized with dataDirectory: ${dataDirectory}, generatedDirectory: ${generatedDirectory}`
  );

  return initializer.loadAllData();
}
