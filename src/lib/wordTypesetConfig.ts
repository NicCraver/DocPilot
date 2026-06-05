export type PageNumberAlign = "odd_even" | "center" | "left" | "right";

export type ColumnsStartMode = "never" | "first_numeric_heading" | "after_front_matter";

export interface JournalHeaderConfig {
  enabled?: boolean;
  font?: string;
  size?: string;
  /** 题名页页眉-左 */
  first_left?: string;
  first_center?: string;
  first_right?: string;
  /** 正文页眉 */
  running_left?: string;
  running_center?: string;
  running_right?: string;
  /** 居中刊名加空格（煤 炭 工 程） */
  center_char_spacing?: boolean;
}

export interface WordTypesetPageConfig {
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  footer_distance: number;
  header_distance?: number;
  page_number_align: PageNumberAlign;
  page_number_font: string;
  page_number_size: string;
  force_a4: boolean;
  /** 1=单栏，2=双栏（期刊正文） */
  columns?: number;
  column_gap_cm?: number;
  /** 双栏起始位置 */
  columns_start?: ColumnsStartMode;
  /** 期刊页眉（煤炭工程等） */
  journal_header?: JournalHeaderConfig;
}

export interface WordTypesetHeadingsConfig {
  title_font: string;
  title_size: string;
  title_line_spacing: number;
  subtitle_font: string;
  subtitle_size: string;
  subtitle_line_spacing: number;
  heading1_font: string;
  heading1_size: string;
  heading2_font: string;
  heading2_size: string;
  body_font: string;
  body_size: string;
  body_line_spacing: number;
  indent_left: number;
  indent_right: number;
}

export interface WordTypesetTableConfig {
  enabled: boolean;
  auto_column_width: boolean;
  unify_borders: boolean;
  bold_header: boolean;
  smart_align: boolean;
  header_font: string;
  body_font: string;
  font_size: string;
  row_spacing: number;
  row_height_cm: number;
  width_percent: number;
  border_pt: number;
}

export interface WordTypesetOtherConfig {
  table_caption_font: string;
  table_caption_size: string;
  figure_caption_font: string;
  figure_caption_size: string;
  attachment_enabled: boolean;
  attachment_font: string;
  attachment_size: string;
  auto_outline: boolean;
  ascii_font: string;
  enable_symbols: boolean;
  /** 文本/MD 模式：合并连续空行为单个段落分隔 */
  collapse_empty_lines: boolean;
  /** 摘要正文（期刊） */
  abstract_font?: string;
  abstract_size?: string;
  abstract_hang_indent_cm?: number;
  /** 作者单位行（期刊） */
  affiliation_font?: string;
  affiliation_size?: string;
  /** 表头三线表（顶/表头下/底线，无竖线） */
  three_line_table?: boolean;
  /** 正文 [1]、[2,3] 引文上标 */
  citation_superscript?: boolean;
  /** 英文表题字号 */
  table_caption_en_size?: string;
}

export interface WordTypesetConfig {
  page: WordTypesetPageConfig;
  headings: WordTypesetHeadingsConfig;
  table: WordTypesetTableConfig;
  other: WordTypesetOtherConfig;
}

export const FONT_OPTIONS = [
  "方正小标宋简体",
  "宋体",
  "黑体",
  "楷体",
  "楷体_GB2312",
  "仿宋",
  "仿宋_GB2312",
  "微软雅黑",
  "Times New Roman",
  "Arial",
] as const;

export const SIZE_OPTIONS = ["二号", "三号", "四号", "小四", "五号", "小五"] as const;

export const PAGE_NUMBER_ALIGN_OPTIONS: { value: PageNumberAlign; label: string }[] = [
  { value: "odd_even", label: "奇偶分页" },
  { value: "center", label: "居中" },
  { value: "left", label: "左对齐" },
  { value: "right", label: "右对齐" },
];

export type WordTypesetPresetId = "government" | "thesis" | "journal";

export interface WordTypesetPreset {
  id: WordTypesetPresetId;
  label: string;
  description: string;
}

export const WORD_TYPESET_PRESETS: WordTypesetPreset[] = [
  {
    id: "government",
    label: "政府格式",
    description: "机关公文：方正小标宋题目、仿宋正文、楷体二级标题",
  },
  {
    id: "thesis",
    label: "学位论文",
    description: "学位论文：黑体标题、宋体小四正文、1.5 倍行距",
  },
  {
    id: "journal",
    label: "期刊论文",
    description: "学术期刊（煤炭工程等）：双栏正文、摘要悬挂缩进、数字编号标题",
  },
];

/** 深合并配置（缺失字段回落到基准） */
export function mergeWordTypesetConfig(
  base: WordTypesetConfig,
  patch?: Partial<WordTypesetConfig> | null,
): WordTypesetConfig {
  if (!patch) return structuredClone(base);
  return {
    ...base,
    ...patch,
    page: { ...base.page, ...patch.page },
    headings: { ...base.headings, ...patch.headings },
    table: { ...base.table, ...patch.table },
    other: { ...base.other, ...patch.other },
  };
}

/** 机关公文常用内置默认（对齐参考工具截图） */
export function governmentWordTypesetConfig(): WordTypesetConfig {
  return {
    page: {
      margin_top: 2.54,
      margin_bottom: 2.54,
      margin_left: 3.17,
      margin_right: 3.17,
      footer_distance: 1.75,
      page_number_align: "odd_even",
      page_number_font: "宋体",
      page_number_size: "四号",
      force_a4: true,
    },
    headings: {
      title_font: "方正小标宋简体",
      title_size: "二号",
      title_line_spacing: 33,
      subtitle_font: "楷体_GB2312",
      subtitle_size: "三号",
      subtitle_line_spacing: 33,
      heading1_font: "黑体",
      heading1_size: "三号",
      heading2_font: "楷体_GB2312",
      heading2_size: "三号",
      body_font: "仿宋_GB2312",
      body_size: "三号",
      body_line_spacing: 28,
      indent_left: 0,
      indent_right: 0,
    },
    table: {
      enabled: true,
      auto_column_width: true,
      unify_borders: true,
      bold_header: true,
      smart_align: false,
      header_font: "仿宋_GB2312",
      body_font: "仿宋_GB2312",
      font_size: "小四",
      row_spacing: 22,
      row_height_cm: 0.7,
      width_percent: 100,
      border_pt: 0.5,
    },
    other: {
      table_caption_font: "黑体",
      table_caption_size: "四号",
      figure_caption_font: "黑体",
      figure_caption_size: "四号",
      attachment_enabled: true,
      attachment_font: "黑体",
      attachment_size: "三号",
      auto_outline: true,
      ascii_font: "Times New Roman",
      enable_symbols: true,
      collapse_empty_lines: true,
    },
  };
}

/** @deprecated 使用 governmentWordTypesetConfig */
export function defaultWordTypesetConfig(): WordTypesetConfig {
  return governmentWordTypesetConfig();
}

/** 学位论文常用排版预设 */
export function thesisWordTypesetConfig(): WordTypesetConfig {
  return {
    page: {
      margin_top: 2.5,
      margin_bottom: 2.5,
      margin_left: 3.0,
      margin_right: 2.0,
      footer_distance: 1.75,
      page_number_align: "center",
      page_number_font: "宋体",
      page_number_size: "五号",
      force_a4: true,
    },
    headings: {
      title_font: "黑体",
      title_size: "二号",
      title_line_spacing: 36,
      subtitle_font: "宋体",
      subtitle_size: "四号",
      subtitle_line_spacing: 24,
      heading1_font: "黑体",
      heading1_size: "三号",
      heading2_font: "黑体",
      heading2_size: "四号",
      body_font: "宋体",
      body_size: "小四",
      body_line_spacing: 22,
      indent_left: 0.74,
      indent_right: 0,
    },
    table: {
      enabled: true,
      auto_column_width: true,
      unify_borders: true,
      bold_header: true,
      smart_align: true,
      header_font: "宋体",
      body_font: "宋体",
      font_size: "五号",
      row_spacing: 18,
      row_height_cm: 0.6,
      width_percent: 100,
      border_pt: 0.5,
    },
    other: {
      table_caption_font: "宋体",
      table_caption_size: "五号",
      figure_caption_font: "宋体",
      figure_caption_size: "五号",
      attachment_enabled: false,
      attachment_font: "宋体",
      attachment_size: "小四",
      auto_outline: true,
      ascii_font: "Times New Roman",
      enable_symbols: true,
      collapse_empty_lines: true,
    },
  };
}

export function journalWordTypesetConfig(): WordTypesetConfig {
  return {
    page: {
      margin_top: 2.0,
      margin_bottom: 2.0,
      margin_left: 1.8,
      margin_right: 1.6,
      footer_distance: 1.5,
      page_number_align: "left",
      page_number_font: "宋体",
      page_number_size: "五号",
      force_a4: true,
      columns: 2,
      column_gap_cm: 0.75,
      columns_start: "after_front_matter",
      header_distance: 1.2,
      journal_header: {
        enabled: true,
        font: "宋体",
        size: "五号",
        first_left: "第56卷第10期",
        first_center: "煤炭工程",
        first_right: "Vol. 56, No. 10",
        running_left: "2024 年第10 期",
        running_center: "煤炭工程",
        running_right: "专家论坛",
        center_char_spacing: true,
      },
    },
    headings: {
      title_font: "黑体",
      title_size: "二号",
      title_line_spacing: 28,
      subtitle_font: "仿宋_GB2312",
      subtitle_size: "小四",
      subtitle_line_spacing: 18,
      heading1_font: "黑体",
      heading1_size: "小四",
      heading2_font: "黑体",
      heading2_size: "五号",
      body_font: "宋体",
      body_size: "五号",
      body_line_spacing: 16,
      indent_left: 0.64,
      indent_right: 0,
    },
    table: {
      enabled: true,
      auto_column_width: true,
      unify_borders: true,
      bold_header: true,
      smart_align: true,
      header_font: "宋体",
      body_font: "宋体",
      font_size: "小五",
      row_spacing: 14,
      row_height_cm: 0.45,
      width_percent: 100,
      border_pt: 0.75,
    },
    other: {
      table_caption_font: "宋体",
      table_caption_size: "五号",
      figure_caption_font: "宋体",
      figure_caption_size: "五号",
      attachment_enabled: false,
      attachment_font: "宋体",
      attachment_size: "五号",
      auto_outline: true,
      ascii_font: "Times New Roman",
      enable_symbols: true,
      collapse_empty_lines: true,
      abstract_font: "楷体_GB2312",
      abstract_size: "五号",
      abstract_hang_indent_cm: 0.64,
      affiliation_font: "宋体",
      affiliation_size: "五号",
      three_line_table: true,
      citation_superscript: true,
      table_caption_en_size: "小五",
    },
  };
}

export function wordTypesetConfigForPreset(id: WordTypesetPresetId): WordTypesetConfig {
  if (id === "thesis") return thesisWordTypesetConfig();
  if (id === "journal") return journalWordTypesetConfig();
  return governmentWordTypesetConfig();
}
