import CosmosDbVectorStore from "./azure_cosmosdb.js";

const timestampIteration = "1749502225445";
const queryFromArgv = process.argv[2];

if (!queryFromArgv) {
  console.error("Please provide a query as a command line argument.");
  process.exit(1);
}

const main = async () => {
  console.log("Query: ", queryFromArgv);

  const vectorStore = new CosmosDbVectorStore();
  const store = await vectorStore.getStore(`vectors_${timestampIteration}`);
  await vectorStore.answerWithStore(store, queryFromArgv);
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
