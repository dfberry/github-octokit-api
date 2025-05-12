export function printEnv(): void {
  // Print environment variables in alphabetical order
  const envVars: Record<string, string> = Object.keys(process.env)
    .sort()
    .reduce((output: Record<string, string>, key: string) => {
      if (process.env[key] !== undefined) {
        output[key] = process.env[key] as string;
      }
      return output;
    }, {});

  console.log('Environment variables (alphabetical order):');
  console.log(JSON.stringify(envVars, null, 2));
}
