import React from "react";

export type ControlType = "select" | "radio" | "boolean" | "text" | "number" | "range";
export type RegistryCategory = "Start" | "Foundations" | "Components" | "Reference";

export interface DocControl<T = any> {
  name: Extract<keyof T, string>;
  type: ControlType;
  label?: string;
  options?: string[];
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
}

export interface PlaygroundConfig<T = any> {
  controls: DocControl<T>[];
  render: (state: T) => React.ReactNode;
  code: (state: T) => string;
}

export interface DocSection {
  type: "markdown" | "props" | "variants" | "playground" | "custom";
  title?: string;
  content?: string;
  propsList?: Array<{ name: string; type: string; default: string; notes: string }>;
  playground?: PlaygroundConfig<any>;
  customRender?: () => React.ReactNode;
}

export interface RegistryEntry {
  id: string;
  title: string;
  category: RegistryCategory;
  description?: string;
  sections: DocSection[];
}
