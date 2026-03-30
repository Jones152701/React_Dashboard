/* ================= CHART ================= */

export interface ChartConfig {
  xKey: string;
  yLabel?: string;
  layout?: "horizontal" | "vertical";
  stacked?: boolean;
  series?: { key: string; color?: string }[];
}

export interface ChartResponse {
  id: string;
  title: string;
  type: "bar" | "pie" | "area";
  tooltip?: string;
  icon?: string;
  data: any[];
  config: ChartConfig;
}

/* ================= WORD CLOUD ================= */

export interface WordCloudConfig {
  minFontSize?: number;
  maxFontSize?: number;
  padding?: number;
  colors?: string[];

  title?: string;
  tooltip?: string;
  icon?: string;
}

export interface WordCloudSection {
  data: Record<string, number>;
  config?: WordCloudConfig;
}

/* ================= HASHTAGS ================= */

export interface HashtagConfig {
  title?: string;
  tooltip?: string;
  icon?: string;
}

export interface HashtagSection {
  data: Record<string, number>;
  config?: HashtagConfig;
}

/* ================= USERS (ADVOCATES / DETRACTORS) ================= */

export interface UserData {
  username: string;
  mentions: number;
}

export interface UserConfig {
  title?: string;
  tooltip?: string;
  icon?: string;
}

export interface UserSection {
  data: UserData[];
  config?: UserConfig;
}

/* ================= MAIN RESPONSE ================= */

export interface SocialMediaResponse {
  cards: any;

  charts: ChartResponse[];

  // ✅ UPDATED (new structure)
  wordcloud: WordCloudSection;
  top_hashtags: HashtagSection;

  // ✅ NEW (fixed)
  top_advocates?: UserSection;
  top_detractors?: UserSection;
}