import readline from "readline";
import path from "path";
import { MarkdownVectorLoader } from "./loadData.js";
import { VectorStoreQuery } from "./queryData.js";

const DATA_DIR = path.resolve(
  "../../packages/health-check/generated/20250608_125932",
);
async function vectorStoreExists(): Promise<boolean> {
  // Use environment variable to control data loading
  const skipLoad = process.env.SKIP_VECTOR_STORE_LOAD === "true";
  return skipLoad ? true : false;
}

async function main() {
  // Load data if not already loaded

  if (!(await vectorStoreExists())) {
    console.log("Loading markdown files into vector store...");
    const loader = new MarkdownVectorLoader();
    await loader.loadMarkdownFilesFromDir(DATA_DIR);
    console.log("Data loaded.");
  } else {
    console.log("Vector store already exists. Skipping data load.");
  }

  // CLI loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const query = new VectorStoreQuery();
  console.log(
    "Ask a question about the loaded markdown data. Type 'exit' to quit.",
  );
  while (true) {
    const userPrompt = await new Promise<string>((resolve) =>
      rl.question("> ", resolve),
    );
    if (userPrompt.trim().toLowerCase() === "exit") break;
    const { answer } = await query.queryLLMWithDocs(userPrompt);
    console.log("\nAnswer:\n" + (answer?.content || answer));
  }
  rl.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
