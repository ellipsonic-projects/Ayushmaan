import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js";

// Runs entirely in the browser (Web Worker) — no server dispatch, no HF
// Inference API call. Loaded as a plain script (not bundled by webpack) via
// `new Worker("/workers/whisper-worker.js", { type: "module" })`, so the CDN
// import above resolves at request time in the browser, same as the
// original apps/microservices/worker.js prototype this was moved from.
//
// Model weights: primary source is the HF Hub (env.remoteHost default),
// same CDN-style delivery as the transformers.js import above. If that's
// unreachable (network policy, HF outage), fall back to the copy bundled
// under apps/web/public/models/Xenova/whisper-tiny.en — same files, same
// quantized/onnx layout transformers.js expects, just served same-origin.
env.localModelPath = "/models/";

class SpeechRecognitionPipeline {
  static task = "automatic-speech-recognition";
  static model = "Xenova/whisper-tiny.en";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      env.allowRemoteModels = true;
      env.allowLocalModels = false;
      try {
        this.instance = await pipeline(this.task, this.model, { progress_callback });
      } catch (remoteError) {
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        this.instance = await pipeline(this.task, this.model, { progress_callback });
      }
    }
    return this.instance;
  }
}

async function transcribe(audio) {
  const transcriber = await SpeechRecognitionPipeline.getInstance((data) => self.postMessage(data));
  const options = {
    chunk_length_s: 30,
    stride_length_s: 5,
  };
  return transcriber(audio, options).catch((error) => {
    self.postMessage({
      status: "error",
      task: "automatic-speech-recognition",
      data: error,
    });
    return null;
  });
}

self.addEventListener("message", async (event) => {
  const { audio, init } = event.data;

  // Pre-load the model without transcribing.
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
