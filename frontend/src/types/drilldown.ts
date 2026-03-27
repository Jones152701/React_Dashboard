// types/drilldown.ts
export interface DrillEvent {
  type: "bar" | "area" | "pie" | "word" | "treemap";
  key: string;
  value: any;
  data: any;
}

export interface DrillState {
  open: boolean;
  loading: boolean;
  data: DrillResponse | null;
  context: {
    key: string;
    value: any;
  } | null;
}

export interface DrillResponse {
  cards: {
    total_reviews: number;
    avg_rating: number;
    avg_sentiment_score: number;
    percentage_of_total: number;
  };
  charts: DrillChart[];
  wordcloud: Record<string, number>;
  reviews: DrillReview[];
}

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

export interface DrillReview {
  username: string;
  platform: string;
  rating: number;
  message: string;
  date: string;
}