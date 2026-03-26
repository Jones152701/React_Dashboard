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
  type: "bar" | "pie" | "area"; // add "treemap" if needed
  tooltip?: string;
  icon?: string;
  data: any[];
  config: ChartConfig;
}

export interface SocialMediaResponse {
  cards: any;

  // ✅ ADD THIS
  charts: ChartResponse[];

  // existing fields
  wordcloud: Record<string, number>;
  top_hashtags: Record<string, number>;

  top_advocates?: any[];
  top_detractors?: any[];
}