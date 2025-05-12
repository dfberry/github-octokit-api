# Use a GITHUB_TOKEN or PAT to collect repo summaries

## Local development

1. Set GITHUB_TOKEN so script has access to it.

    ```console
    export GITHUB_TOKEN=your_github_token_here
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