# GitHub Health Check Tool

A tool to collect repository data and generate health reports using GitHub's API.

## Local development

1. Set GITHUB_TOKEN so script has access to it.

    ```console
    export GITHUB_TOKEN=your_github_token_here
    ```

## GraphQL API Optimization

This tool now uses GraphQL API by default to reduce the number of API requests made to GitHub. This provides several benefits:

- **Fewer API requests**: Combines multiple REST API calls into a single GraphQL query
- **Faster execution**: Reduces roundtrips to the GitHub API
- **Higher rate limit efficiency**: GraphQL has a higher query complexity limit
- **Caching**: Local file-based caching reduces repeated API calls
- **Batching**: Processes multiple repositories in a single API call

### Usage

The tool uses GraphQL optimization by default. If you prefer the original REST API implementation:

```console
npm start -- --health-check --use-rest
```

To use the optimized GraphQL version (default):

```console
npm start -- --health-check
```

For convenience, you can also use the provided script which will prompt for a GitHub token if one isn't set:

```console
./run-health-check.sh
```

### Detailed Documentation

- [GraphQL Implementation](./GRAPHQL_IMPLEMENTATION.md) - Technical details of the GraphQL implementation
- [Rate Limit Optimization](./RATE_LIMIT_OPTIMIZATION.md) - Strategies for reducing API calls
- [GraphQL Guide](./GRAPHQL_GUIDE.md) - Guide to using the GraphQL features

```console
npm start -- --health-check
```

## Prettier configuration

For Microsoft Documentation (Learn) sites, I'd recommend a Prettier configuration that aligns with Microsoft's code style guidelines. Here's an optimal configuration:

```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "proseWrap": "preserve",
  "endOfLine": "lf"
}
```

This configuration:

* Uses 80 characters for line length (standard for documentation)
* 2-space indentation (common Microsoft standard)
* Single quotes for strings (Microsoft preference)
* Semicolons required (for clarity)
* Includes trailing commas where valid in ES5
* Uses spaces instead of tabs (for consistent rendering)
* Preserves prose wrapping (good for markdown files)