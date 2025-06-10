import { AzureCosmosDBNoSQLVectorStore } from "@langchain/azure-cosmosdb";
import type { AzureCosmosDBNoSQLConfig } from "@langchain/azure-cosmosdb";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AzureOpenAIEmbeddings, AzureChatOpenAI } from "@langchain/openai";
import type { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import {
  JSONLoader,
  JSONLinesLoader,
} from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { extname, join, relative } from "path";
import { createRetrievalChain } from "langchain/chains/retrieval";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//console.log(process.env);

const embeddings = new AzureOpenAIEmbeddings({
  apiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
  azureOpenAIApiDeploymentName: "text-embedding-ada-002", // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
  openAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
  deploymentName: "text-embedding-ada-002", // Optional, default is "text-embedding-ada-002"
  maxRetries: 2, // Optional, default is 2
  timeout: 60000, // Optional, default is 60 seconds
});

const llm = new AzureChatOpenAI({
  model: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
  azureOpenAIApiInstanceName: "openai-dfb-1", // In Node.js defaults to process.env.AZURE_OPENAI_API_INSTANCE_NAME
  azureOpenAIApiDeploymentName: "gpt-4.1-mini", // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
  timeout: 60000, // Optional, default is 60 seconds
  maxRetries: 2, // Optional, default is 2
});

const initialDocument: Document = {
  pageContent:
    "Github Health Check Vector Store holds information about all sample code contributors, and the sample code repositories that contribute to.",
  id: "initial-document",
  metadata: {
    source: "initial-document",
    timestamp: new Date().toISOString(),
  },
};

const timestamp = Date.now();
console.log(`timestamp: ${timestamp}`);

export default class CosmosDbVectorStore {
  getStore(containerName: string): AzureCosmosDBNoSQLVectorStore {
    const dbConfig: AzureCosmosDBNoSQLConfig = {
      databaseName: "chat",
      containerName: containerName,
    };

    const store = new AzureCosmosDBNoSQLVectorStore(embeddings, dbConfig);
    return store;
  }
  private async findFilesWithExtensions(
    dir: string,
    extensions: string[],
  ): Promise<string[]> {
    let results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(
          await this.findFilesWithExtensions(fullPath, extensions),
        );
      } else if (extensions.includes(extname(entry.name))) {
        results.push(fullPath);
      }
    }
    return results;
  }
  async getFiles(pathToDocuments: string): Promise<Document[]> {
    const supportedLoaders: Record<string, (path: string) => any> = {
      ".json": (path) => new JSONLoader(path, "/texts"),
      ".jsonl": (path) => new JSONLinesLoader(path, "/html"),
      ".md": (path) => new TextLoader(path),
      ".txt": (path) => new TextLoader(path),
      ".csv": (path) => new CSVLoader(path, "text"),
    };

    const extensions = Object.keys(supportedLoaders);
    const absRoot = path.isAbsolute(pathToDocuments)
      ? pathToDocuments
      : join(__dirname, pathToDocuments);

    const files = await this.findFilesWithExtensions(absRoot, extensions);

    const documents: Document[] = [];
    for (const file of files) {
      console.log(`Loading file: ${file}`);
      const ext = extname(file);
      const loaderFactory = supportedLoaders[ext];
      if (!loaderFactory) continue;
      const loader = loaderFactory(file);
      // Each loader returns an array of Document(s)
      // eslint-disable-next-line no-await-in-loop
      const loadedDocs: Document[] = await loader.load();
      // Set id to relative path/filename for each doc
      const relPath = relative(absRoot, file);
      loadedDocs.forEach((doc, idx) => {
        doc.id = `${relPath}-${idx}`;
        console.log(`Document ID set to: ${doc.id}`);
      });
      documents.push(...loadedDocs);
    }
    console.log(`Loaded ${documents.length} documents.`);
    return documents;
  }
  async loadStore(
    pathToDocuments: string,
  ): Promise<AzureCosmosDBNoSQLVectorStore> {
    const initialSplitDocument = await this.splitDocuments([initialDocument]);

    const azureContainerName = "vectors_" + timestamp.toString();
    console.log(
      `Creating Azure Cosmos DB Vector Store with container name: ${azureContainerName}`,
    );

    const store = await AzureCosmosDBNoSQLVectorStore.fromDocuments(
      initialSplitDocument,
      embeddings,
      {
        databaseName: "chat",
        containerName: azureContainerName,
      },
    );
    const fileDocuments = await this.getFiles(pathToDocuments);
    await this.batchInsert(store, fileDocuments);

    return store;
  }

  async splitDocuments(documents: Document[]): Promise<Document[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 0,
    });
    console.log("Splitting document into chunks...");
    const splitDocuments = (
      await Promise.all(
        documents.map(async (doc) => {
          const splits = await splitter.splitDocuments([doc]);
          return splits.map((split, idx) => ({
            ...split,
            id: `${doc.id ?? "doc"}-chunk-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            _partitionKey: doc.id ?? "default",
          }));
        }),
      )
    ).flat();
    console.log(`Split into ${splitDocuments.length} chunks.`);
    return splitDocuments;
  }
  async batchInsert(
    store: AzureCosmosDBNoSQLVectorStore,
    documents: Document[],
  ): Promise<void> {
    const batchSize = 10;
    for (const doc of documents) {
      // Split the document into chunks
      console.log(`Processing document: ${doc.id || "unknown"}`);
      const splits = await this.splitDocuments([doc]);
      console.log(
        `Document ${doc.id || "unknown"} split into ${splits.length} chunks.`,
      );
      // Assign unique IDs to each chunk using doc.id and chunk index
      const chunksWithIds = splits.map((split, idx) => ({
        ...split,
        id: `${doc.id ?? "doc"}-chunk-${idx}`,
        _partitionKey: doc.id ?? "default",
      }));

      // Insert chunks in batches of 10, with retry/backoff logic
      for (let i = 0; i < chunksWithIds.length; i += batchSize) {
        console.log(
          `Inserting chunks ${i} to ${i + batchSize - 1} for document ${
            doc.id || "unknown"
          }`,
        );
        const batch = chunksWithIds.slice(i, i + batchSize);
        let success = false;
        let retries = 0;
        let delay = 10000; // start with 10 seconds

        while (!success && retries < 5) {
          try {
            await store.addDocuments(batch);
            console.log(
              `Added document chunks with ids: ${batch.map((d) => d.id).join(", ")}`,
            );
            success = true;
          } catch (err: any) {
            if (err.statusCode === 429) {
              // Cosmos DB rate limit hit
              const retryAfter = err.headers?.["x-ms-retry-after-ms"];
              const waitTime = retryAfter ? parseInt(retryAfter, 10) : delay;
              console.warn(
                `Rate limited. Waiting ${waitTime}ms before retrying...`,
              );
              await new Promise((resolve) => setTimeout(resolve, waitTime));
              delay *= 2; // Exponential backoff
              retries++;
            } else {
              throw err;
            }
          }
        }
        if (!success) {
          console.error("Failed to add batch after multiple retries.");
        }
      }
    }
  }

  async answerWithRetriever(
    store: AzureCosmosDBNoSQLVectorStore,
    query: string,
    k: number = 5,
    filter: any = undefined,
  ) {
    const retriever = await store.asRetriever(k, filter);
    return retriever.invoke(query);
  }

  async answerWithStore(
    store: AzureCosmosDBNoSQLVectorStore,
    query: string,
  ): Promise<void> {
    const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "Answer the user's questions based on the below context:\n\n{context}",
      ],
      ["human", "{input}"],
    ]);

    const combineDocsChain = await createStuffDocumentsChain({
      llm,
      prompt: questionAnsweringPrompt,
    });

    const chain = await createRetrievalChain({
      retriever: store.asRetriever(),
      combineDocsChain,
    });

    const res = await chain.invoke({
      input: query,
    });

    console.log(res.answer);
  }
}
