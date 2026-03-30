// types/drilldown.ts

export interface DrillEvent {
  type: "bar" | "area" | "pie" | "word" | "treemap";
  key: string;
  value: any;
  data: any;
}

/* ================= WORD CLOUD TYPES ================= */

// ✅ Config type
export interface WordCloudConfig {
  minFontSize?: number;
  maxFontSize?: number;
  padding?: number;
}

// ✅ New format
export interface WordCloudObject {
  data: Record<string, number>;
  config?: WordCloudConfig;
}

// ✅ Support BOTH formats (important for backward compatibility)
export type WordCloudData = Record<string, number> | WordCloudObject;

/* ================= MAIN STATE ================= */

export interface DrillState {
  open: boolean;
  loading: boolean;
  data: DrillResponse | null;
  context: {
    key: string;
    value: any;
  } | null;
}

/* ================= RESPONSE ================= */

export interface DrillResponse {
  cards: {
    total_reviews: number;
    avg_rating: number;
    avg_sentiment_score: number;
    percentage_of_total: number;
  };

  charts: DrillChart[];

  // ✅ UPDATED (critical fix)
  wordcloud: WordCloudData;

  reviews: DrillReview[];
}

/* ================= CHART ================= */

export interface DrillChart {
  chart_id: string;
  chart_type: "area" | "bar" | "pie" | "line";
  title: string;
  x_key: string;
  y_key: string;
  data: any[];
  is_date?: boolean;
  layout?: "horizontal" | "vertical";
}

/* ================= REVIEW ================= */

export interface DrillReview {
  username: string;
  platform: string;
  rating: number;
  message: string;
  date: string;
}