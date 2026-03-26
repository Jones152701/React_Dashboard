import React from "react";
import ChartCard from "../ChartCard/ChartCard";
import ChartRenderer from "../../ChartRender";
import WordCloudVisx from "../../../graphs/WordCloud";
import Cards from "../../cards/Cards";
import type { SocialMediaResponse } from "../../../types/socialMedia";
import "./SentimentTab.css";

/* ---------------- TYPES ---------------- */

interface Props {
  data: SocialMediaResponse | null;
  loading: boolean;
}

/* ---------------- TREND SVG ---------------- */

const getTrendSVG = (value: number) => {
  const isPositive = value > 0;
  const isNegative = value < 0;

  const color = isPositive
    ? "#198754"
    : isNegative
      ? "#dc3545"
      : "gray";

  const points = isPositive
    ? "1,20 10,10 18,15 39,2"
    : isNegative
      ? "1,4 10,14 18,9 39,22"
      : "1,12 39,12";

  const arrow = isPositive
    ? "30,2 39,2 39,10"
    : isNegative
      ? "30,22 39,22 39,14"
      : "33,7 39,12 33,17";

  return (
    <svg width="56" height="40" viewBox="0 0 40 24">
      <polyline points={points} stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={arrow} stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ---------------- COMPONENT ---------------- */

const SocialMediaChart: React.FC<Props> = ({ data, loading }) => {

  const charts = data?.charts || [];

  /* ---------------- CARDS ---------------- */
  const renderCards = () => {
    if (!data?.cards) return null;

    const cards = data.cards;

    return (
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-xl">
          <Cards
            title="Reviews"
            count={cards.total_reviews_card?.count?.toLocaleString() || "0"}
            percentage={cards.total_reviews_card?.trend?.value || 0}
            arrow={getTrendSVG(cards.total_reviews_card?.trend?.value || 0)}
          />
        </div>

        <div className="col-12 col-md-6 col-xl">
          <Cards
            title="Positive"
            count={cards.positive_card?.count?.toLocaleString() || "0"}
            percentage={cards.positive_card?.trend?.value || 0}
            arrow={getTrendSVG(cards.positive_card?.trend?.value || 0)}
          />
        </div>

        <div className="col-12 col-md-6 col-xl">
          <Cards
            title="Neutral"
            count={cards.neutral_card?.count?.toLocaleString() || "0"}
            percentage={cards.neutral_card?.trend?.value || 0}
            arrow={getTrendSVG(cards.neutral_card?.trend?.value || 0)}
          />
        </div>

        <div className="col-12 col-md-6 col-xl">
          <Cards
            title="Negative"
            count={cards.negative_card?.count?.toLocaleString() || "0"}
            percentage={cards.negative_card?.trend?.value || 0}
            arrow={getTrendSVG(cards.negative_card?.trend?.value || 0)}
          />
        </div>

        <div className="col-12 col-md-6 col-xl">
          <Cards
            title="Avg Rating"
            count={`${(cards.avg_rating_card?.value || 0).toFixed(1)} /5`}
            percentage={cards.avg_rating_card?.trend?.value || 0}
            arrow={getTrendSVG(cards.avg_rating_card?.trend?.value || 0)}
          />
        </div>
      </div>
    );
  };

  /* ---------------- FIND SPECIFIC CHARTS ---------------- */
  const dailySentimentChart = charts.find((chart: any) => chart.id === "daily_sentiment");
  const ratingDistributionChart = charts.find((chart: any) => chart.id === "rating_distribution");
  const sentimentScoreTrendChart = charts.find((chart: any) => chart.id === "sentiment_score_trend");

  /* ---------------- WORD CLOUD ---------------- */
  const wordCloudData = Object.entries(data?.wordcloud || {}).map(
    ([text, value]) => ({ 
      text, 
      value: value as number 
    })
  ).sort((a, b) => b.value - a.value);

  /* ---------------- HASHTAGS ---------------- */
  const hashtags = Object.entries(data?.top_hashtags || {}).map(
    ([text, value]) => ({
      text: text.replace("#", ""),
      value: value as number
    })
  ).sort((a, b) => b.value - a.value).slice(0, 10); // Ensure only top 10

  /* ---------------- RENDER ---------------- */
  return (
    <div className="container-fluid">

      {/* Cards Section */}
      {renderCards()}

      <div className="row g-4">

        {/* DAILY SENTIMENT - Full width on first row */}
        {dailySentimentChart && (
          <div className="col-12">
            <ChartCard
              title={dailySentimentChart.title}
              tooltip={dailySentimentChart.tooltip}
              icon={dailySentimentChart.icon}
              loading={loading}
            >
              <ChartRenderer chart={dailySentimentChart} />
            </ChartCard>
          </div>
        )}

        {/* Rating Distribution and Sentiment Score Trend - Side by side */}
        <div className="col-12 col-lg-6">
          {ratingDistributionChart && (
            <ChartCard
              title={ratingDistributionChart.title}
              tooltip={ratingDistributionChart.tooltip}
              icon={ratingDistributionChart.icon}
              loading={loading}
            >
              <ChartRenderer chart={ratingDistributionChart} />
            </ChartCard>
          )}
        </div>

        <div className="col-12 col-lg-6">
          {sentimentScoreTrendChart && (
            <ChartCard
              title={sentimentScoreTrendChart.title}
              tooltip={sentimentScoreTrendChart.tooltip}
              icon={sentimentScoreTrendChart.icon}
              loading={loading}
            >
              <ChartRenderer chart={sentimentScoreTrendChart} />
            </ChartCard>
          )}
        </div>

        {/* WORD CLOUD - Static component */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title="Word Cloud"
            tooltip="Most frequent words in reviews"
            icon="bi bi-cloud"
            loading={loading}
          >
            <div style={{ height: 320, width: "100%" }}>
              {wordCloudData.length > 0 ? (
                <WordCloudVisx data={wordCloudData} />
              ) : (
                <div className="text-center py-4 text-muted">
                  No word cloud data available
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* TOP HASHTAGS - Static component */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title="Top 10 Hashtags"
            tooltip="Most used hashtags in reviews"
            icon="bi bi-hash"
            loading={loading}
          >
            {hashtags.length > 0 ? (
              <div className="hashtags-grid">
                {hashtags.map((tag, i) => (
                  <div key={i} className="hashtag-card">
                    <div className="hashtag-left">
                      <span className="hash-symbol">#</span>
                      <span className="hashtag-text">{tag.text}</span>
                    </div>
                    <div className="hashtag-count">
                      {tag.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted">
                No hashtags found
              </div>
            )}
          </ChartCard>
        </div>

      </div>
    </div>
  );
};

export default SocialMediaChart;