function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Error: Missing required environment variable: ${name}\n` +
        "  OPENAI_API_KEY is required for Whisper transcription.\n" +
        "  Get your API key at: https://platform.openai.com/api-keys"
    );
    process.exit(1);
  }
  return value;
}

export const OPENAI_API_KEY = getRequiredEnv("OPENAI_API_KEY");
