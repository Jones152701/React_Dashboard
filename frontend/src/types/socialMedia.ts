export interface SocialMediaResponse {
  // Sentiment tab data
  cards: any;
  daily_sentiment: any[];
  rating_distribution: any[];
  sentiment_score_trend: any[];
  wordcloud: Record<string, number>;
  top_hashtags: Record<string, number>;

  // Audience tab data
  language_distribution: any[];
  gender_distribution: any[];
  top_advocates: any[];
  top_detractors: any[];
  activity_by_hour: any[];
  activity_by_day: any[];

  // AI Insights tab data
  primary_mentions: any[];
  issue_type_distribution: any[];
  journey_sentiment: any[];
  resolution_status: any[];
  value_for_money: any[];
  churn_risk: any[];
  

}