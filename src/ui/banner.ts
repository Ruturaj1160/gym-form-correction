export type BannerAction = [
  label: string,
  onClick: () => void,
  primary?: boolean,
];

/** Compact top overlay that leaves the camera view visible. */
export class Banner {
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLElement;
  private readonly textEl: HTMLParagraphElement;
  private readonly actionsEl: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "banner";
    this.root.hidden = true;
    this.titleEl = document.createElement("strong");
    this.textEl = document.createElement("p");
    this.actionsEl = document.createElement("div");
    this.actionsEl.className = "panel-actions";
    this.root.append(this.titleEl, this.textEl, this.actionsEl);
    container.appendChild(this.root);
  }

  show(title: string, text: string, actions: BannerAction[]): void {
    this.titleEl.textContent = title;
    this.setText(text);
    this.setActions(actions);
    this.root.hidden = false;
  }

  setText(text: string): void {
    this.textEl.textContent = text;
  }

  setActions(actions: BannerAction[]): void {
    this.actionsEl.replaceChildren(
      ...actions.map(([label, onClick, primary]) => {
        const btn = document.createElement("button");
        btn.className = primary ? "btn btn-primary" : "btn";
        btn.textContent = label;
        btn.onclick = onClick;
        return btn;
      }),
    );
  }

  hide(): void {
    this.root.hidden = true;
  }
}
