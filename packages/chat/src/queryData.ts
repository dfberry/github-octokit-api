import { RAG } from "./rag.js";

/**
 * Class to query the vector store using a user's prompt and retrieve relevant documents.
 */
export class VectorStoreQuery {
  private rag: RAG;

  constructor() {
    this.rag = new RAG();
  }

  async query(prompt: string, k = 5, filter: any = undefined): Promise<any> {
    const { vectorStore } = this.rag.init();
    return this.rag.query(vectorStore, prompt, k, filter);
  }

  /**
   * Query the LLM with the retrieved documents and user prompt for a synthesized answer.
   */
  async queryLLMWithDocs(
    prompt: string,
    k = 5,
    filter: any = undefined,
  ): Promise<any> {
    const { vectorStore, llm } = this.rag.init();
    const docs = await this.rag.query(vectorStore, prompt, k, filter);
    // Compose a context string from the docs
    const context = docs
      .map((doc: any) => doc.pageContent || doc.content || JSON.stringify(doc))
      .join("\n---\n");
    const llmPrompt = `Context:\n${context}\n\nUser question: ${prompt}\n\nAnswer:`;
    // Use the LLM to generate an answer
    const response = await llm.invoke(llmPrompt);
    return { answer: response, docs };
  }
}
