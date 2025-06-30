import GitHubRequestor, { isGitHubRequestorError } from './github.js';
import {
  InfrastructureData,
  InfrastructureFolder,
  InfrastructureType,
} from '../models.js';

export default class GitHubInfrastructure {
  protected requestor: GitHubRequestor;

  constructor(token: string) {
    this.requestor = new GitHubRequestor(token);
  }

  /**
   * Collect infrastructure data for a repository
   */
  async collectInfrastructureData(
    org: string,
    repo: string
  ): Promise<InfrastructureData> {
    console.log(`Collecting infrastructure data for ${org}/${repo}`);

    // Initialize the infrastructure data with default values
    const infraData: InfrastructureData = {
      org,
      repo,
      full_name: `${org}/${repo}`,
      hasInfrastructure: false,
      infrastructureType: [],
      infrastructureFolders: [],
      hasAzureYaml: false,
      lastUpdated: new Date().toISOString(),
    };

    try {
      // 1. Check if repository exists
      const repoData = await this.requestor.getRepo(org, repo);
      if (isGitHubRequestorError(repoData)) {
        console.error(
          `Error getting repository data: ${repoData.errorMessage}`
        );
        return infraData;
      }

      // 2. Look for common infrastructure folders
      await this.checkInfrastructureFolders(infraData);

      // 3. Look for azure.yaml file in the root
      await this.checkAzureYaml(infraData);

      // Set hasInfrastructure if we found any infrastructure folders or azure.yaml
      infraData.hasInfrastructure =
        infraData.infrastructureFolders.length > 0 || infraData.hasAzureYaml;

      // Update last updated time
      infraData.lastUpdated = new Date().toISOString();

      return infraData;
    } catch (error) {
      console.error(`Error collecting infrastructure data: ${error}`);
      return infraData;
    }
  }

  /**
   * Check for infrastructure folders in the repository
   */
  private async checkInfrastructureFolders(
    infraData: InfrastructureData
  ): Promise<void> {
    // Common infrastructure folder names to check
    const folderPaths = [
      '', // Check root directory
      'infra',
      'infrastructure',
      'bicep',
      'terraform',
      'iac',
      'arm',
      'deploy',
    ];

    for (const folderPath of folderPaths) {
      try {
        // Get the contents of the folder
        const contents = await this.requestor.getRepoContents(
          infraData.org,
          infraData.repo,
          folderPath
        );

        // Skip if there was an error or if not a directory
        if (isGitHubRequestorError(contents)) continue;

        // Array means it's a directory
        if (Array.isArray(contents)) {
          // Look for infrastructure files in this directory
          await this.processDirectoryContents(infraData, contents, folderPath);
        }
      } catch (error) {
        console.error(`Error checking folder ${folderPath}: ${error}`);
        // Continue with the next folder
        continue;
      }
    }
  }

  /**
   * Process the contents of a directory to look for infrastructure files
   */
  private async processDirectoryContents(
    infraData: InfrastructureData,
    contents: any[],
    currentPath: string
  ): Promise<void> {
    // Look for Bicep files (.bicep)
    const bicepFiles = contents.filter(
      item => item.type === 'file' && item.name.endsWith('.bicep')
    );

    // Look for Terraform files (.tf, .tfvars)
    const terraformFiles = contents.filter(
      item =>
        item.type === 'file' &&
        (item.name.endsWith('.tf') ||
          item.name.endsWith('.tfvars') ||
          item.name === 'terraform.lock.hcl')
    );

    // Look for ARM template files (azuredeploy.json, template.json)
    const armFiles = contents.filter(
      item =>
        item.type === 'file' &&
        (item.name === 'azuredeploy.json' ||
          item.name === 'template.json' ||
          (item.name.includes('deploy') && item.name.endsWith('.json')))
    );

    // Add infrastructure folders if any infrastructure files are found
    if (bicepFiles.length > 0) {
      this.addInfrastructureFolder(
        infraData,
        currentPath || 'root',
        'bicep',
        bicepFiles.length
      );
      if (!infraData.infrastructureType.includes('bicep')) {
        infraData.infrastructureType.push('bicep');
      }
    }

    if (terraformFiles.length > 0) {
      this.addInfrastructureFolder(
        infraData,
        currentPath || 'root',
        'terraform',
        terraformFiles.length
      );
      if (!infraData.infrastructureType.includes('terraform')) {
        infraData.infrastructureType.push('terraform');
      }
    }

    if (armFiles.length > 0) {
      this.addInfrastructureFolder(
        infraData,
        currentPath || 'root',
        'arm',
        armFiles.length
      );
      if (!infraData.infrastructureType.includes('arm')) {
        infraData.infrastructureType.push('arm');
      }
    }

    // Recursively check subfolders that might contain infrastructure files
    const subfolders = contents.filter(item => item.type === 'dir');
    for (const subfolder of subfolders) {
      const subfolderPath = currentPath
        ? `${currentPath}/${subfolder.name}`
        : subfolder.name;

      try {
        const subfolderContents = await this.requestor.getRepoContents(
          infraData.org,
          infraData.repo,
          subfolderPath
        );

        if (
          !isGitHubRequestorError(subfolderContents) &&
          Array.isArray(subfolderContents)
        ) {
          await this.processDirectoryContents(
            infraData,
            subfolderContents,
            subfolderPath
          );
        }
      } catch (error) {
        // Skip errors for subfolders
        console.error(`Error processing subfolder ${subfolderPath}: ${error}`);
      }
    }
  }

  /**
   * Add an infrastructure folder to the data structure
   */
  private addInfrastructureFolder(
    infraData: InfrastructureData,
    path: string,
    type: InfrastructureType,
    fileCount: number
  ): void {
    const folder: InfrastructureFolder = {
      path,
      type,
      hasFiles: fileCount > 0,
      fileCount,
    };

    // Check if we already have this folder
    const exists = infraData.infrastructureFolders.some(
      f => f.path === folder.path && f.type === folder.type
    );

    if (!exists) {
      infraData.infrastructureFolders.push(folder);
    }
  }

  /**
   * Check for Azure YAML file (azure.yaml or .azure/*.yaml)
   */
  private async checkAzureYaml(infraData: InfrastructureData): Promise<void> {
    // Check for azure.yaml in the root directory
    try {
      const rootContents = await this.requestor.getRepoContents(
        infraData.org,
        infraData.repo,
        ''
      );

      if (
        !isGitHubRequestorError(rootContents) &&
        Array.isArray(rootContents)
      ) {
        // Look for azure.yaml
        const azureYaml = rootContents.find(
          item => item.type === 'file' && item.name === 'azure.yaml'
        );

        if (azureYaml) {
          infraData.hasAzureYaml = true;
          infraData.azureYamlPath = 'azure.yaml';
        }
      }
    } catch (error) {
      console.error(`Error checking root directory for azure.yaml: ${error}`);
    }

    // Check for yaml files in .azure directory
    if (!infraData.hasAzureYaml) {
      try {
        const azureDirContents = await this.requestor.getRepoContents(
          infraData.org,
          infraData.repo,
          '.azure'
        );

        if (
          !isGitHubRequestorError(azureDirContents) &&
          Array.isArray(azureDirContents)
        ) {
          // Look for yaml files
          const yamlFiles = azureDirContents.filter(
            item =>
              item.type === 'file' &&
              (item.name.endsWith('.yaml') || item.name.endsWith('.yml'))
          );

          if (yamlFiles.length > 0) {
            infraData.hasAzureYaml = true;
            infraData.azureYamlPath = `.azure/${yamlFiles[0].name}`;
          }
        }
      } catch (error) {
        // .azure directory may not exist, which is fine
        console.error(`Error checking .azure directory: ${error}`);
      }
    }
  }
}
