import CosmosDbVectorStore from "./azure_cosmosdb.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const main = async () => {
  const vectorStore = new CosmosDbVectorStore();

  const datafilePath = path.join(__dirname, "..", "data");
  console.log("Loading data from:", datafilePath);

  await vectorStore.loadStore(datafilePath);
};

main()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error during vector store operation:", e);
    process.exit(1);
  });
