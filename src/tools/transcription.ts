import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { stat } from "node:fs/promises";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../auth.js";
import {
  execCommand,
  toolResult,
  toolError,
  createTempDir,
  cleanupTempDir,
} from "../runner.js";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const MAX_WHISPER_SIZE = 25 * 1024 * 1024; // 25 MB

async function splitAndTranscribe(
  audioPath: string,
  language: string,
  includeTimestamps: boolean,
  tempDir: string,
): Promise<{ text: string; segments?: Array<{ start: number; end: number; text: string }> }> {
  const { stdout: durationOut } = await execCommand(
    "ffprobe",
    ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", audioPath],
    { timeout: 10_000 },
  );
  const totalDuration = parseFloat(durationOut.trim());
  const chunkDuration = 600; // 10 min chunks
  const chunks = Math.ceil(totalDuration / chunkDuration);

  let fullText = "";
  const allSegments: Array<{ start: number; end: number; text: string }> = [];

  for (let i = 0; i < chunks; i++) {
    const startTime = i * chunkDuration;
    const chunkPath = join(tempDir, `chunk_${i}.mp3`);

    await execCommand(
      "ffmpeg",
      [
        "-i", audioPath,
        "-ss", String(startTime),
        "-t", String(chunkDuration),
        "-vn",
        "-acodec", "libmp3lame",
        "-q:a", "5",
        "-y",
        chunkPath,
      ],
      { timeout: 60_000 },
    );

    const responseFormat = includeTimestamps ? "verbose_json" : "json";
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(chunkPath),
      model: "whisper-1",
      language,
      response_format: responseFormat,
    });

    if (includeTimestamps && "segments" in transcription) {
      const segments = (transcription as unknown as { segments: Array<{ start: number; end: number; text: string }> }).segments ?? [];
      for (const seg of segments) {
        allSegments.push({
          start: seg.start + startTime,
          end: seg.end + startTime,
          text: seg.text.trim(),
        });
      }
      fullText += (transcription as unknown as { text: string }).text + " ";
    } else {
      fullText += transcription.text + " ";
    }
  }

  return {
    text: fullText.trim(),
    ...(includeTimestamps ? { segments: allSegments } : {}),
  };
}

export function registerTranscriptionTools(server: McpServer) {
  server.registerTool(
    "transcribe_audio",
    {
      title: "Transcribe Audio",
      description:
        "Transcribe a local audio file using OpenAI Whisper API. Supports any audio format (mp3, wav, m4a, etc.). Handles files larger than 25MB by automatically splitting into chunks. Optimized for Portuguese (PT-BR) but supports any language.",
      inputSchema: {
        file_path: z
          .string()
          .describe("Absolute path to a local audio file (mp3, wav, m4a, etc.)"),
        language: z
          .string()
          .default("pt")
          .describe("Language code for transcription (default: 'pt' for Portuguese)"),
        include_timestamps: z
          .boolean()
          .default(false)
          .describe("Include word-level timestamps in output"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ file_path, language, include_timestamps }) => {
      const tempDir = await createTempDir();
      try {
        const fileInfo = await stat(file_path);
        let result: { text: string; segments?: Array<{ start: number; end: number; text: string }> };

        if (fileInfo.size > MAX_WHISPER_SIZE) {
          result = await splitAndTranscribe(file_path, language, include_timestamps, tempDir);
        } else {
          const responseFormat = include_timestamps ? "verbose_json" : "json";
          const transcription = await openai.audio.transcriptions.create({
            file: createReadStream(file_path),
            model: "whisper-1",
            language,
            response_format: responseFormat,
          });

          if (include_timestamps && "segments" in transcription) {
            const segments = (transcription as unknown as { segments: Array<{ start: number; end: number; text: string }> }).segments ?? [];
            result = {
              text: (transcription as unknown as { text: string }).text,
              segments: segments.map((s) => ({
                start: s.start,
                end: s.end,
                text: s.text.trim(),
              })),
            };
          } else {
            result = { text: transcription.text };
          }
        }

        // Get audio duration via ffprobe
        let duration: number | null = null;
        try {
          const { stdout: durationOut } = await execCommand(
            "ffprobe",
            ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", file_path],
            { timeout: 10_000 },
          );
          duration = parseFloat(durationOut.trim()) || null;
        } catch {
          // non-critical, skip
        }

        return toolResult({
          transcript: result.text,
          ...(result.segments ? { segments: result.segments } : {}),
          metadata: {
            language,
            duration,
            filePath: file_path,
            fileSize: fileInfo.size,
            wasChunked: fileInfo.size > MAX_WHISPER_SIZE,
          },
        });
      } catch (error) {
        return toolError(
          `Failed to transcribe audio: ${(error as Error).message}`,
        );
      } finally {
        await cleanupTempDir(tempDir);
      }
    },
  );
}
