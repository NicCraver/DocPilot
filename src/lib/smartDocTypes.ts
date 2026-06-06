export interface SmartDocStyle {
  font_ascii?: string;
  font_ea?: string;
  size_pt?: number;
  bold?: boolean;
  align?: string;
  line_spacing?: number;
  first_line_indent_chars?: number;
  outline_level?: number;
}

export interface SmartDocSection {
  key: string;
  title: string;
  level: number;
  placeholder?: boolean;
}

export interface SmartDocProfile {
  version: number;
  styles: Record<string, SmartDocStyle>;
  structure: SmartDocSection[];
  meta_fields: Array<{ label: string; pattern: string }>;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  section_count: number;
  has_thumbnail: boolean;
}

export interface SmartDocFillItem {
  input: string;
  output: string;
}

export interface SmartDocFillResult {
  results: SmartDocFillItem[];
  logs: string[];
}

export type SmartDocContentMode = "adaptive" | "llm";
export type AdaptiveInput = "file" | "text";
