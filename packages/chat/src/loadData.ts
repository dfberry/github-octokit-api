import fs from "fs/promises";
import path from "path";
import { RAG } from "./rag.js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

/**
 * Loads all markdown files from a directory, splits them into documents, and loads them into a vector store using RAG.
 */
export class MarkdownVectorLoader {
  private rag: RAG;

  constructor() {
    this.rag = new RAG();
  }

  async loadMarkdownFilesFromDir(dirPath: string): Promise<any> {
    const contextLength = 1000;
    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    console.log(`Found ${mdFiles.length} markdown files in ${dirPath}`);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: contextLength - 100, // leave some buffer for metadata/tokens
      chunkOverlap: 200,
    });
    let totalChunks = 0;
    let insertedChunks = 0;
    const { vectorStore } = this.rag.init();

    for (const file of mdFiles) {
      const filePath = path.join(dirPath, file);
      const content = await fs.readFile(filePath, "utf-8");
      // Split markdown content into chunks
      const splits = await splitter.splitText(content);
      let fileChunks: any[] = [];
      for (const chunk of splits) {
        if (chunk.length > 12000) {
          const subSplits = chunk.match(/.{1,12000}/gs) || [];
          for (const subChunk of subSplits) {
            fileChunks.push({ pageContent: subChunk, metadata: { file } });
            totalChunks++;
            if (fileChunks.length === 2) {
              await this.rag.addItemsToStore(vectorStore, fileChunks);
              insertedChunks += fileChunks.length;
              console.log(
                `Inserted ${insertedChunks}/${totalChunks} chunks so far...`,
              );
              fileChunks = [];
            }
          }
        } else {
          fileChunks.push({ pageContent: chunk, metadata: { file } });
          totalChunks++;
          if (fileChunks.length === 2) {
            await this.rag.addItemsToStore(vectorStore, fileChunks);
            insertedChunks += fileChunks.length;
            console.log(
              `Inserted ${insertedChunks}/${totalChunks} chunks so far...`,
            );
            fileChunks = [];
          }
        }
      }
      // Insert any remaining chunks for this file
      if (fileChunks.length > 0) {
        await this.rag.addItemsToStore(vectorStore, fileChunks);
        insertedChunks += fileChunks.length;
        console.log(
          `Inserted ${insertedChunks}/${totalChunks} chunks so far...`,
        );
      }
    }

    console.log(`Loaded ${totalChunks} chunks from markdown files.`);
    console.log("All chunks added to vector store.");

    return vectorStore;
  }
}
