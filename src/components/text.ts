import { TextObject } from "../canvas/text.ts";
import { Component, ComponentOptions } from "../component.ts";
import { Rectangle } from "../types.ts";

export interface TextOptions extends Omit<ComponentOptions, "rectangle"> {
  value: string;
  rectangle: Omit<Rectangle, "width" | "height"> & {
    width?: number;
  };
  multiCodePointSupport?: boolean;
}

export class Text extends Component {
  declare drawnObjects: { text: TextObject };

  value: string;
  multiCodePointSupport: boolean;

  constructor(options: TextOptions) {
    super(options as unknown as ComponentOptions);
    this.value = options.value;
    this.multiCodePointSupport = options.multiCodePointSupport ?? false;
  }

  draw(): void {
    const text = new TextObject({
      canvas: this.tui.canvas,
      view: () => this.view,
      value: () => this.value,
      style: () => this.style,
      zIndex: () => this.zIndex,
      rectangle: () => this.rectangle,
      multiCodePointSupport: () => this.multiCodePointSupport,
    });

    this.drawnObjects.text = text;
    text.draw();
  }
}
