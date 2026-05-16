function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  if (!value && !fallback) {
    console.warn(`[env] Optional variable ${name} is not set`);
  }
  return value ?? fallback;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  ANTHROPIC_API_KEY: requireEnv("ANTHROPIC_API_KEY"),
  OPENAI_API_KEY: optionalEnv("OPENAI_API_KEY"),
  APP_URL: requireEnv("NEXT_PUBLIC_APP_URL"),
} as const;
