export function reduceTextToMaxLengthWithPadding(text: string, error: string, paddingPercentage: number): string {

    if (!text || !error) return text;

    if (!error.includes('maximum context length')) {
        console.warn('\tError message does not indicate a context length issue. Returning original text.');
        return text;
    }

    const extracted = extractErrorInformationWithPadding(error, paddingPercentage);
    if (!extracted || extracted.error) {
        console.warn('\tCould not extract max and requested values from error message. Returning original text.');
        return text;
    }

    const overagePercentage = calculatePercentageReduction(extracted.requested, extracted.max);
    const totalReductionPercentage = overagePercentage + paddingPercentage;
    const reducedText = reduceByPercentage(text, totalReductionPercentage);
    return reducedText;
}
// Add padding to reduce the requested tokens further
export function extractErrorInformationWithPadding(error: any, paddingPercentage: number = 10): { error: string, max: number; requested: number; adjusted: number } | null {

    try {

        if (!error) {
            console.warn('No error message provided.');
            return { error: 'No error message provided', max: 0, requested: 0, adjusted: 0 };
        }
        const regex = /maximum context length is (\d+) tokens.*?requested (\d+) tokens/;
        const match = error.match(regex);

        if (match) {
            const max = parseInt(match[1], 10);
            const requested = parseInt(match[2], 10);
            // Adjust `adjustedRequested` to be the percentage difference that `requested` was over `max`
            const overagePercentage = ((requested - max) / max) * 100;
            const adjusted = overagePercentage * (1 + paddingPercentage / 100);
            return { max, requested, adjusted, error: '' };
        }

        return { error: 'Could not extract max and requested values from error message', max: 0, requested: 0, adjusted: 0 };
    } catch (error) {
        console.error('Error extracting information from error message:', error);
        return { error: 'Error extracting information from error message', max: 0, requested: 0, adjusted: 0 };
    }

}

function calculatePercentageReduction(requested: number, max: number): number {
    if (requested <= max) return 0; // No reduction needed
    const overage = requested - max;
    return (overage / requested) * 100;
}

function reduceByPercentage(text: string, percentage: number): string {
    const reduceLength = Math.floor(text.length * (percentage / 100));
    const reducedText = text.slice(0, text.length - reduceLength);
    console.log(`\tReduced text by ${percentage.toFixed(2)}% from ${text.length} to ${reducedText.length} characters.`);
    return reducedText;
}