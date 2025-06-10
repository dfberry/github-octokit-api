import CosmosDbVectorStore from "./azure_cosmosdb.js";
import type { AzureCosmosDBNoSQLVectorStore } from "@langchain/azure-cosmosdb";

const main = async () => {
  const timestamp = "1749488352222";
  const service = new CosmosDbVectorStore();
  const store: AzureCosmosDBNoSQLVectorStore = service.getStore(
    `vectors_${timestamp}`,
  );

  const answer = await service.answerWithStore(
    store,
    "Summarize the top 10 contriutors and the main projects they contributed to.",
  );
  console.log("Answer from vector store query:");
  console.log(answer);
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
