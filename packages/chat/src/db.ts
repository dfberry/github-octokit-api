import { Container } from '@azure/cosmos';

export async function getRelevantDocuments(container: Container, queryVector: number[], limit: number = 10): Promise<string> {
    try {
        const findRelevanctDocumentsQuery = `
          SELECT c.id, c.category, c.document_summary, c.document_summary_embedding, VectorDistance(c.document_summary_embedding, @queryVector) AS SimilarityScore
          FROM c
          WHERE IS_DEFINED(c.document_summary_embedding)
          ORDER BY VectorDistance(c.document_summary_embedding, @queryVector)
          OFFSET 0 LIMIT ${limit}
        `;
        const { resources: docs } = await container.items.query({
          query: findRelevanctDocumentsQuery,
          parameters: [
            {
              name: '@queryVector',
              value: queryVector
            }
          ]
        }).fetchAll();

        console.log(`Fetched ${docs.length} relevant documents from Cosmos DB`);

        return docs.map(doc => `## Document: ${doc.category}\n${doc.document_summary}\n\n`).join('');
    } catch (error) {
        console.error('Error fetching relevant documents:', error);
        throw error;
    }
}
