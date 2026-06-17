import { readFile } from "fs/promises";
import decode from "audio-decode";

export async function getAudioDurationSeconds(filePath: string): Promise<number> {
  try {
    const buffer = await readFile(filePath);
    const audioBuffer = await decode(buffer);
    return audioBuffer.duration ?? 0;
  } catch {
    return 0;
  }
}
