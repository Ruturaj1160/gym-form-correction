import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { landmarkIndex } from "./metrics";
import type { JointRef, Side, SideMode } from "./types";

const SWITCH_MARGIN = 0.15;

/** Picks which body side(s) to measure; "auto" is sticky to avoid flipping every frame. */
export class SideSelector {
  private current: Side = "left";

  constructor(
    private readonly mode: SideMode,
    private readonly joints: JointRef[],
  ) {}

  select(landmarks: NormalizedLandmark[]): Side[] {
    if (this.mode === "left" || this.mode === "right") return [this.mode];
    if (this.mode === "both" || this.mode === "each") return ["left", "right"];

    const left = this.score(landmarks, "left");
    const right = this.score(landmarks, "right");
    if (this.current === "left" && right > left + SWITCH_MARGIN)
      this.current = "right";
    else if (this.current === "right" && left > right + SWITCH_MARGIN)
      this.current = "left";
    return [this.current];
  }

  private score(landmarks: NormalizedLandmark[], side: Side): number {
    let sum = 0;
    for (const ref of this.joints)
      sum += landmarks[landmarkIndex(ref, side)]?.visibility ?? 0;
    return sum / this.joints.length;
  }
}
