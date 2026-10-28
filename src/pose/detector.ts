import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

export type PoseModel = "lite" | "full" | "heavy";

const modelUrl = (model: PoseModel) =>
  `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${model}/float16/latest/pose_landmarker_${model}.task`;

export async function createPoseDetector(
  model: PoseModel = "full",
): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(
    `${import.meta.env.BASE_URL}mediapipe/wasm`,
  );

  const create = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: modelUrl(model), delegate },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

  try {
    return await create("GPU");
  } catch (err) {
    console.warn("GPU delegate unavailable, falling back to CPU", err);
    return create("CPU");
  }
}
