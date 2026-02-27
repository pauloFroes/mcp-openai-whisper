# mcp-openai-whisper

MCP server wrapping [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text) for audio transcription.

Works with Claude Code, Codex, Claude Desktop, Cursor, VS Code, Windsurf, and any MCP-compatible client.

## Prerequisites

- **Node.js** 18+
- **FFmpeg** and **FFprobe** installed (for audio chunking of large files)
- **OpenAI API key**

| Variable | Where to find |
|----------|---------------|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

Install FFmpeg:

```bash
brew install ffmpeg
```

## Installation

### Claude Code

```bash
claude mcp add openai-whisper -e OPENAI_API_KEY=your-key -- npx -y github:pauloFroes/mcp-openai-whisper
```

### Codex

Add to your `codex.toml`:

```toml
[mcp.openai-whisper]
command = "npx"
args = ["-y", "github:pauloFroes/mcp-openai-whisper"]

[mcp.openai-whisper.env]
OPENAI_API_KEY = "your-key"
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openai-whisper": {
      "command": "npx",
      "args": ["-y", "github:pauloFroes/mcp-openai-whisper"],
      "env": {
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "openai-whisper": {
      "command": "npx",
      "args": ["-y", "github:pauloFroes/mcp-openai-whisper"],
      "env": {
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "openai-whisper": {
      "command": "npx",
      "args": ["-y", "github:pauloFroes/mcp-openai-whisper"],
      "env": {
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

### Windsurf

Add to `~/.windsurf/mcp.json`:

```json
{
  "mcpServers": {
    "openai-whisper": {
      "command": "npx",
      "args": ["-y", "github:pauloFroes/mcp-openai-whisper"],
      "env": {
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `transcribe_audio` | Transcribe a local audio file via Whisper (auto-splits files >25MB) |

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `file_path` | string | required | Absolute path to local audio file |
| `language` | string | `"pt"` | ISO language code (optimized for PT-BR) |
| `include_timestamps` | boolean | `false` | Include segment-level timestamps |

## How it works

1. Reads the local audio file
2. If >25MB, splits into 10-minute chunks using FFmpeg
3. Sends each chunk to OpenAI Whisper API
4. Returns combined transcript with optional timestamps

## License

MIT
