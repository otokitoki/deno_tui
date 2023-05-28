// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { TextObject } from "../canvas/text.ts";
import { Component, ComponentOptions } from "../component.ts";

import { cropToWidth, textWidth } from "../utils/strings.ts";

import type { Rectangle } from "../types.ts";
import { BaseSignal, Computed, Effect, Signal } from "../signals.ts";
import { signalify } from "../utils/signals.ts";

export type LabelRectangle = Omit<Rectangle, "width" | "height"> & {
  width?: number;
  height?: number;
};

export interface LabelAlign {
  vertical: "top" | "center" | "bottom";
  horizontal: "left" | "center" | "right";
}

export interface LabelOptions extends Omit<ComponentOptions, "rectangle"> {
  text: string | BaseSignal<string>;
  rectangle: LabelRectangle | BaseSignal<LabelRectangle>;
  align?: LabelAlign | BaseSignal<LabelAlign>;
  multiCodePointSupport?: boolean | BaseSignal<boolean>;
  overwriteRectangle?: boolean | BaseSignal<boolean>;
}

export class Label extends Component {
  declare drawnObjects: { texts: TextObject[] };

  #valueLines: BaseSignal<string[]>;

  text: BaseSignal<string>;
  align: BaseSignal<LabelAlign>;
  overwriteRectangle: BaseSignal<boolean>;
  multiCodePointSupport: BaseSignal<boolean>;

  constructor(options: LabelOptions) {
    super(options as ComponentOptions);

    this.text = signalify(options.text);
    this.overwriteRectangle = signalify(options.overwriteRectangle ?? false);
    this.multiCodePointSupport = signalify(options.multiCodePointSupport ?? false);
    this.align = signalify(options.align ?? { vertical: "top", horizontal: "left" }, { deepObserve: true });

    // FIXME: This is temporary workaround, Computed should be used after Signal rewrite
    this.#valueLines = new Signal(this.text.value.split("\n"));
    this.text.subscribe(() => {
      this.#valueLines.value = this.text.value.split("\n");
    });

    new Effect(() => {
      const rectangle = this.rectangle.value;
      const overwriteRectangle = this.overwriteRectangle.value;
      const valueLines = this.#valueLines.value;

      if (!overwriteRectangle) {
        rectangle.width = valueLines.reduce((p, c) => Math.max(p, textWidth(c)), 0);
        rectangle.height = valueLines.length;
      }

      const drawnTexts = (this.drawnObjects.texts ??= []).length;

      if (valueLines.length > drawnTexts) {
        this.#fillDrawObjects();
      } else if (valueLines.length < drawnTexts) {
        this.#popUnusedDrawObjects();
      }
    });
  }

  draw(): void {
    super.draw();
    this.drawnObjects.texts ??= [];
    this.#fillDrawObjects();
  }

  #fillDrawObjects(): void {
    if (!this.#valueLines) throw new Error("#valueLines has to be set");

    const { drawnObjects } = this;

    for (let offset = drawnObjects.texts.length; offset < this.#valueLines.peek().length; ++offset) {
      const textRectangle = { column: 0, row: 0, width: 0, height: 0 };
      const text = new TextObject({
        canvas: this.tui.canvas,
        view: this.view,
        style: this.style,
        zIndex: this.zIndex,
        multiCodePointSupport: this.multiCodePointSupport,
        value: new Computed(() => {
          const value = this.#valueLines.value[offset];
          return cropToWidth(value, this.rectangle.value.width);
        }),
        rectangle: new Computed(() => {
          const valueLines = this.#valueLines.value;

          const { column, row, width, height } = this.rectangle.value;
          textRectangle.column = column;
          textRectangle.row = row + offset;

          let value = valueLines[offset];
          value = cropToWidth(value, width);
          const valueWidth = textWidth(value);

          const { vertical, horizontal } = this.align.value;
          switch (horizontal) {
            case "center":
              textRectangle.column += ~~((width - valueWidth) / 2);
              break;
            case "right":
              textRectangle.column += width - valueWidth;
              break;
          }

          textRectangle.row = row + offset;
          switch (vertical) {
            case "center":
              textRectangle.row += ~~(height / 2 - valueLines.length / 2);
              break;
            case "bottom":
              textRectangle.row += height - valueLines.length;
              break;
          }

          return textRectangle;
        }),
      });

      drawnObjects.texts[offset] = text;
      text.draw();
    }
  }

  #popUnusedDrawObjects(): void {
    if (!this.#valueLines) throw new Error("#valueLines has to be set");

    for (const text of this.drawnObjects.texts.splice(this.#valueLines.peek().length)) {
      text.erase();
    }
  }
}
