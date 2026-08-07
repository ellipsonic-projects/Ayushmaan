import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js";
env.allowLocalModels = false;

class SpeechRecognitionPipeline {
  static task = "automatic-speech-recognition";
  static model = "Xenova/whisper-tiny.en";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

const transcribe = async (audio) => {
  const p = SpeechRecognitionPipeline;
  const transcriber = await p.getInstance((data) => self.postMessage(data));
  const options = {
    chunk_length_s: 30,
    stride_length_s: 5,
  };
  return await transcriber(audio, options).catch((error) => {
    self.postMessage({
      status: "error",
      task: "automatic-speech-recognition",
      data: error,
    });
    return null;
  });
};

self.addEventListener("message", async (event) => {
  const { audio, init } = event.data;

  // Pre-load the model without transcribing
  if (init) {
    await SpeechRecognitionPipeline.getInstance((data) => self.postMessage(data));
    return;
  }

  const transcript = await transcribe(audio);
  if (transcript === null) return;

  self.postMessage({
    status: "complete",
    task: "automatic-speech-recognition",
    data: transcript,
  });
});
