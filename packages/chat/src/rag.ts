import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Ollama } from "@langchain/ollama";

export class RAG {
  init() {
    const llmOllama = new Ollama({
      model: "llama3", // Default value
      temperature: 0,
      maxRetries: 2,
    });
    const embeddings = new OllamaEmbeddings({
      model: "mxbai-embed-large", // Default value
      baseUrl: "http://localhost:11434", // Default value
    });

    const vectorStore = new Chroma(embeddings, {
      collectionName: "my_collection",
      url: "http://localhost:8000", // or "chromadb" if running in Docker Compose
      collectionMetadata: {
        "hnsw:space": "cosine",
      },
    });
    return {
      vectorStore,
      embeddings,
      llm: llmOllama,
    };
  }

  async addItemsToStore(vectorStore: any, documents: any[]): Promise<any> {
    const ids = Array.from({ length: documents.length }, (_, i) =>
      (i + 1).toString(),
    );

    console.log(
      `Adding ${documents.length} documents to vector store with IDs: ${ids.join(", ")}`,
    );
    const response = await vectorStore.addDocuments(documents, { ids });
    console.log(`Added ${response.count} documents to vector store.`);
    return response;
  }

  async query(
    vectorStore: any,
    query: string,
    k: number = 5,
    filter: any = undefined,
  ) {
    const retriever = await vectorStore.asRetriever(k, filter);
    return retriever.invoke(query);
  }
}
