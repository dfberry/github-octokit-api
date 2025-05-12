// Update the import to use custom repo type
export interface SimpleRepository {
  name: string;
  org: string;
  repo: string;
}

// Helper function to extract repositories from README
export function extractRepositoriesFromReadme(
  content: string
): SimpleRepository[] {
  // First find all reference-style links in the table
  const tableLinksRegex = /\|\s*\[([^\]]+)\]\[([^\]]+)\]\s*\|/g;
  const referenceLinks: Map<string, string> = new Map();
  const repos: SimpleRepository[] = [];

  // Then find all reference definitions
  const refDefinitionRegex =
    /\[([^\]]+)\]:\s*https:\/\/github\.com\/([^\/]+)\/([^\s\n]+)/g;

  let refMatch: RegExpExecArray | null;
  // Extract all reference definitions
  while ((refMatch = refDefinitionRegex.exec(content)) !== null) {
    const [_, refId, org, repo] = refMatch;
    referenceLinks.set(refId, `${org}/${repo.trim()}`);
  }

  // Now extract links from the table
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableLinksRegex.exec(content)) !== null) {
    const [_, displayName, refId] = tableMatch;

    // Look up the reference ID
    if (referenceLinks.has(refId)) {
      const [org, repo] = referenceLinks.get(refId)!.split('/');
      repos.push({ name: displayName, org, repo });
    }
  }

  // Fallback to check for inline links if no repos found
  if (repos.length === 0) {
    const inlineRepoRegex: RegExp =
      /\[([^\]]+)\]\(https:\/\/github\.com\/([^\/]+)\/([^\/\)]+)/g;
    let match: RegExpExecArray | null;

    while ((match = inlineRepoRegex.exec(content)) !== null) {
      const [_, linkText, org, repo] = match;
      repos.push({ name: linkText, org, repo });
    }
  }

  console.log(`Found ${repos.length} repositories in README`);

  // Alpha sort repositories by name
  return repos.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Converts an array of GitHub URLs to an array of Repository objects
 * @param {string[]} githubUrls - Array of GitHub repository URLs
 * @returns {SimpleRepository[]} - Array of Repository objects
 */
export function extractOrgAndRepo(githubUrls: string[]): SimpleRepository[] {
  return githubUrls.map((url: string) => {
    const [org, repo] = url.split('/');

    console.log(`Extracted org: ${org}, repo: ${repo} from URL: ${url}`);

    return {
      name: url,
      org,
      repo,
    };
  });
}
