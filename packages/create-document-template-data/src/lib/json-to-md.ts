export function jsonToMarkdown(
  category: string,
  json: Record<string, any>
): string {
  try {
    let markdown = `## ${category}\n\n`;

    for (const [key, value] of Object.entries(json)) {
      if (Array.isArray(value)) {
        markdown += `### ${key}\n\n`;
        value.forEach((item, index) => {
          markdown += `- **Item ${index + 1}**: ${JSON.stringify(item, null, 2)}\n`;
        });
      } else if (typeof value === 'object' && value !== null) {
        if (key === 'readme') {
          markdown += `### ${key}\n\n`;
          markdown += `${value}\n\n`;
        } else {
          markdown += `### ${key}\n\n`;
          markdown += `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
        }
      } else {
        if (value === null || value === undefined) {
          continue;
        }
        if (key === 'readme') {
          markdown += `### ${key}\n\n`;
          markdown += `${value}\n\n`;
        } else {
          markdown += `- **${key}**: ${value}\n`;
        }
      }
    }

    if (!markdown || markdown.length === 0) {
      console.log('empty markdown');
    }

    return markdown;
  } catch (error) {
    console.error('Error converting JSON to Markdown:', error);
    return '';
  }
}
export function countWords(text: string): number {
  // Match sequences of alphanumeric characters (words)
  const words = text.match(/\w+/g);
  // Return the count of matched words or 0 if no matches
  return words ? words.length : 0;
}
export function limitWordCount(text: string, wordCount: number): string {
  // Split the text into words
  const words = text.split(/\s+/);
  // Limit to the specified word count
  const limitedWords = words.slice(0, wordCount);
  // Join the limited words back into a string
  const limitedResult = limitedWords.join(' ');

  console.log(
    `\tlimit word count: ${words.length} down to ${limitedWords.length} words.`
  );

  return limitedResult;
}
