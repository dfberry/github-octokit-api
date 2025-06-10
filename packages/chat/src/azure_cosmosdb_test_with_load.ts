import CosmosDbVectorStore from "./azure_cosmosdb.js";

const main = async () => {
  const vectorStore = new CosmosDbVectorStore();

  const store = await vectorStore.loadStore("data");

  const answer = await vectorStore.answerWithStore(
    store,
    "Which contributor is most active in the project?",
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
