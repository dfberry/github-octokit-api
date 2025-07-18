# Azure samples using JavaScript or TypeScript

## Quick Start: Get Answers from the Data

If you just want to use this project to get answers from the data (e.g., ask questions about GitHub repositories):

1. **Install dependencies:**
   ```bash
   npm install
   ```
1. **Set up your environment variables:**
   - Copy the provided `.env.example` to `.env` in the project root and fill in your credentials.

1. Run required scripts

    ```
    ./global_env.sh
    ./scripts/build_all.sh
    ```


1. **Run the packages in order:**
   ```bash
   npm run scan-1
   npm run data-2
   npm run generate-3
   npm run move-4
   npm run chat-5
   ```
   - This will build and run the chat interface, using the data and environment variables you provided.

---

## Packages

### Shared @dfb/* Dependency Packages

| Package         | Path                          | Purpose                                      |
|----------------|-------------------------------|----------------------------------------------|
| @dfb/ai        | packages/ai-models            | Core AI utilities and OpenAI integration     |
| @dfb/db        | packages/sqlite-typeorm-db    | TypeORM-based database models and logic      |
| @dfb/finddb    | packages/finddb               | Utility for finding and working with DB files|
| @dfb/octokit   | packages/octokit              | GitHub API and workflow integration          |

### Top-level Workflow Packages (Run in Order)

| Step | Script Name         | Package Path                  | Description                                 |
|------|---------------------|-------------------------------|---------------------------------------------|
| 1    | npm run scan-1      | packages/scrape               | Gathers and scrapes data from sources       |
| 2    | npm run data-2      | packages/health-check         | Processes and checks the health of the data |
| 3    | npm run generate-3  | packages/create-document-template-data | Generates document templates from processed data |
| 4    | npm run move-4      | packages/sqlite-to-cosmos     | Migrates data from SQLite to Cosmos DB      |
| 5    | npm run chat-5      | packages/chat                 | Provides a chat interface to query the data |

## Troubleshooting

If you have difficulty with an issue or PR in these samples, open an issue on this repository.

