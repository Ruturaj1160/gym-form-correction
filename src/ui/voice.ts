export class Voice {
  enabled = true;
  private readonly supported = "speechSynthesis" in window;
  private readonly lastSaid = new Map<string, number>();

  /**
   * @param interrupt cancel anything currently queued (e.g. rapid rep counts)
   * @param throttleMs skip if the same text was spoken within this window
   */
  say(text: string, { interrupt = false, throttleMs = 0 } = {}): void {
    if (!this.enabled || !this.supported) return;
    const now = performance.now();
    const last = this.lastSaid.get(text);
    if (throttleMs && last !== undefined && now - last < throttleMs) return;
    this.lastSaid.set(text, now);

    if (interrupt) speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    speechSynthesis.speak(utterance);
  }

  cancel(): void {
    if (this.supported) speechSynthesis.cancel();
  }
}
