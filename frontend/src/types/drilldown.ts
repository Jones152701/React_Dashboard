// types/drilldown.ts

export interface DrillEvent {
  type: "bar" | "area" | "pie" | "word" | "treemap";
  key: string;
  value: any;
  data: any;
}

/* ================= PAGINATION TYPES ================= */

export interface Pagination {
  total_reviews: number;
  total_pages: number;
  current_page: number;
  limit: number;
  per_page?: number;  // Optional alias for limit
}

/* ================= WORD CLOUD TYPES ================= */

// ✅ Config type
export interface WordCloudConfig {
  minFontSize?: number;
  maxFontSize?: number;
  padding?: number;
  colors?: string[];  // ✅ Added colors support
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
  // ✅ ADDED: fetch function for pagination
  fetch?: (params: DrillFetchParams) => void;
}

/* ================= FETCH PARAMS ================= */

export interface DrillFetchParams {
  page: number;
  type: string;
  context?: {
    key: string;
    value: any;
  };
  limit?: number;  // Optional: items per page
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
  
  // ✅ ADDED: pagination support
  pagination?: Pagination;
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
  icon?: string;  // Optional icon for chart title
  config?: {
    drillKey?: string;  // For nested drilldown
    [key: string]: any;
  };
}

/* ================= REVIEW ================= */

export interface DrillReview {
  username: string;
  platform: string;
  rating: number;
  message: string;
  date: string;
  created_date?: string;  // Alias for date
  sentiment?: string;     // Optional sentiment analysis
  country?: string;       // Optional country
  link?: string;          // Optional original review link
}


