import { spawn } from "child_process";
import * as path from "path";
import { logger } from "./logger";

/**
 * Voice generation configuration
 */
export interface VoiceGenerationConfig {
  text: string;
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  speed?: number;
  model?: "tts-1" | "tts-1-hd";
  format?: "mp3" | "opus" | "aac" | "flac" | "wav";
  maxLength?: number;
}

/**
 * Voice generation result
 */
export interface VoiceGenerationResult {
  success: boolean;
  audioPath: string;
  message: string;
  error?: string;
}

/**
 * Generate voice response using the existing Python voice generation system
 * This replaces the shell script wrapper with direct Node.js execution
 */
export async function generateVoiceResponse(config: VoiceGenerationConfig): Promise<VoiceGenerationResult> {
  return new Promise((resolve, reject) => {
    const {
      text,
      voice = "nova",
      speed = 1.0,
      model = "tts-1",
      format = "mp3",
      maxLength = 1000
    } = config;

    // Define paths
    const pythonScript = "/Users/erezfern/Workspace/my-jarvis/tools/src/cli/auto_jarvis_voice.py";
    const outputDir = "/Users/erezfern/Workspace/my-jarvis/tools/voice";

    // Build arguments for Python script
    const args = [
      pythonScript,
      text,
      "--voice", voice,
      "--model", model,
      "--format", format,
      "--speed", speed.toString(),
      "--max-length", maxLength.toString(),
      "--output-dir", outputDir,
      "--json-output" // Request JSON output for structured parsing
    ];

    // Add API key from environment
    const env = {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    };

    if (!env.OPENAI_API_KEY) {
      reject(new Error("OPENAI_API_KEY environment variable is not set"));
      return;
    }

    logger.chat.debug("Generating voice with Python script: {args}", { args, voice, speed });

    // Execute Python script
    const pythonProcess = spawn("python3", args, {
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        try {
          // Parse JSON output from Python script
          const result = JSON.parse(stdout.trim());

          if (result.success && result.saved_path) {
            logger.chat.info("Voice generation successful: {audioPath}", { audioPath: result.saved_path });
            resolve({
              success: true,
              audioPath: result.saved_path,
              message: text
            });
          } else {
            logger.chat.error("Voice generation failed: {error}", { error: result.error });
            reject(new Error(result.error || "Voice generation failed"));
          }
        } catch (parseError) {
          // Fallback: try to parse legacy output format
          const audioPathMatch = stdout.match(/Audio generated successfully at: (.+\.mp3)/);
          if (audioPathMatch) {
            const audioPath = audioPathMatch[1];
            logger.chat.info("Voice generation successful (legacy format): {audioPath}", { audioPath });
            resolve({
              success: true,
              audioPath,
              message: text
            });
          } else {
            logger.chat.error("Failed to parse voice generation output: {stdout}", { stdout, stderr });
            reject(new Error(`Failed to parse voice generation output: ${parseError}`));
          }
        }
      } else {
        logger.chat.error("Voice generation process failed: {code} {stderr}", { code, stderr });
        reject(new Error(`Voice generation process failed with code ${code}: ${stderr}`));
      }
    });

    pythonProcess.on("error", (error) => {
      logger.chat.error("Failed to start voice generation process: {error}", { error });
      reject(new Error(`Failed to start voice generation process: ${error.message}`));
    });

    // Set timeout to prevent hanging
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error("Voice generation timed out after 30 seconds"));
    }, 30000);
  });
}

/**
 * Generate audio URL based on deployment mode
 */
export function generateAudioUrl(audioPath: string): string {
  // Extract filename from path
  const filename = path.basename(audioPath);

  // Check deployment mode from environment
  const deploymentMode = process.env.VITE_DEPLOYMENT_MODE || process.env.DEPLOYMENT_MODE;

  if (deploymentMode === 'electron') {
    // Electron mode: Use file:// protocol for local filesystem access
    return `file://${audioPath}`;
  } else if (deploymentMode === 'web') {
    // Web mode: Use HTTP API endpoint to serve voice files
    return `/api/voice/${filename}`;
  } else {
    // Fallback to file:// for unknown modes
    return `file://${audioPath}`;
  }
}