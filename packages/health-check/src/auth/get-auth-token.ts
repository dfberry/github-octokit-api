export function getAuthToken(argToken: string | undefined = undefined): string {
  const token: string = argToken || process.env.GITHUB_TOKEN || '';

  if (!token) {
    throw new Error('GITHUB_TOKEN is not set in the environment variables');
  }
  return token;
}
