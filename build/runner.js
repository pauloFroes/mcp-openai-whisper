import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export function toolResult(data) {
    return {
        content: [
            { type: "text", text: JSON.stringify(data, null, 2) },
        ],
    };
}
export function toolError(message) {
    return {
        isError: true,
        content: [{ type: "text", text: message }],
    };
}
export async function execCommand(command, args, options) {
    const timeout = options?.timeout ?? 300_000;
    return new Promise((resolve, reject) => {
        execFile(command, args, { maxBuffer: 50 * 1024 * 1024, timeout }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Command failed: ${command} ${args.join(" ")}\n${stderr || error.message}`));
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}
export async function createTempDir() {
    const dir = join(tmpdir(), `mcp-openai-whisper-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    return dir;
}
export async function cleanupTempDir(dir) {
    try {
        await rm(dir, { recursive: true, force: true });
    }
    catch {
        // best-effort cleanup
    }
}
