export function getDaysAgo(daysAgo: number): string {
  const daysAgoMs = daysAgo * 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - daysAgoMs);
  const sinceDate = `${since.toISOString().slice(0, 10)}`;
  return sinceDate;
}
