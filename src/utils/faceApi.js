import * as faceapi from 'face-api.js';

// face-api.js models are loaded lazily from a CDN rather than bundled under
// public/, to keep the repo small (the weight files are tens of MB). This
// well-known jsdelivr mirror of the model repo is what most face-api.js
// tutorials point at.
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

let modelsLoadedPromise = null;

export function loadFaceModels() {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  }
  return modelsLoadedPromise;
}

async function loadImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Computes a 128-length face descriptor from an uploaded photo, entirely in
 * the browser. Throws a descriptive error if no face (or no model) is found.
 */
export async function computeFaceDescriptor(file) {
  await loadFaceModels();
  const img = await loadImage(file);

  const detection = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    throw new Error('No face was detected in that photo. Try a clearer, front-facing photo.');
  }

  return Array.from(detection.descriptor);
}
