/*
When Not to Average
If you need fine-grained retrieval (e.g. finding the exact chunk that mentions a bug), keep the chunk-level vectors.

If your chunks vary wildly in content or importance, averaging may dilute key signals.
*/

export function averageEmbedding(vectors: number[][]): number[] {
  const length = vectors[0].length;
  const sum = new Array(length).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < length; i++) {
      sum[i] += vec[i];
    }
  }

  return sum.map(val => val / vectors.length);
}
