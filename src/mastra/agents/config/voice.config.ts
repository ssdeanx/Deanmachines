
// agent voice config add this to the agent config
// for Transcribing Audio Input, 
import { createReadStream } from "fs";
import * as path from "node:path";
import { createWriteStream } from "fs";

// Read audio file and transcribe
const audioFilePath = path.join(process.cwd(), "/agent.m4a");
const audioStream = createReadStream(audioFilePath);

try {
    console.log("Transcribing audio file...");
    const transcription = await agent.voice.listen(audioStream, {
        filetype: "m4a",
    });
    console.log("Transcription:", transcription);
} catch (error) {
    console.error("Error transcribing audio:", error);
}

// Generate speech and save to file
const audio = await agent.voice.speak("Hello, World!");
const filePath = path.join(process.cwd(), "agent.mp3");
const writer = createWriteStream(filePath);

audio.pipe(writer);

await new Promise<void>((resolve, reject) => {
    writer.on("finish", () => resolve());
    writer.on("error", reject);
});