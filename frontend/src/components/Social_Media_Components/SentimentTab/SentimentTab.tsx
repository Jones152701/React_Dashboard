import React from "react";
import ChartCard from "../ChartCard/ChartCard";
import ChartRenderer from "../../ChartRender";
import WordCloudVisx from "../../../graphs/WordCloud";
import Cards from "../../cards/Cards";
import type { SocialMediaResponse } from "../../../types/socialMedia";
import type { DrillEvent } from "../../ChartRender"; // ✅ IMPORT TYPE
import "./SentimentTab.css";

/* ---------------- TYPES ---------------- */

interface Props {
  data: SocialMediaResponse | null;
  loading: boolean;
  onDrillDown?: (event: DrillEvent) => void; // ✅ ADD THIS
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
      <polyline points={points} stroke={color} strokeWidth="3.5" fill="none" />
      <polyline points={arrow} stroke={color} strokeWidth="3.5" fill="none" />
    </svg>
  );
};

/* ---------------- COMPONENT ---------------- */

const SocialMediaChart: React.FC<Props> = ({ data, loading, onDrillDown }) => {
  const charts = data?.charts || [];

  /* ---------------- CARDS ---------------- */
  const renderCards = () => {
    if (!data?.cards) return null;

    const cards = data.cards;

    return (
      <div className="row g-3 mb-4">
        <div className="col">
          <Cards title="Reviews" count={cards.total_reviews_card?.count?.toLocaleString() || "0"} percentage={cards.total_reviews_card?.trend?.value || 0} arrow={getTrendSVG(cards.total_reviews_card?.trend?.value || 0)} />
        </div>

        <div className="col">
          <Cards title="Positive" count={cards.positive_card?.count?.toLocaleString() || "0"} percentage={cards.positive_card?.trend?.value || 0} arrow={getTrendSVG(cards.positive_card?.trend?.value || 0)} />
        </div>

        <div className="col">
          <Cards title="Neutral" count={cards.neutral_card?.count?.toLocaleString() || "0"} percentage={cards.neutral_card?.trend?.value || 0} arrow={getTrendSVG(cards.neutral_card?.trend?.value || 0)} />
        </div>

        <div className="col">
          <Cards title="Negative" count={cards.negative_card?.count?.toLocaleString() || "0"} percentage={cards.negative_card?.trend?.value || 0} arrow={getTrendSVG(cards.negative_card?.trend?.value || 0)} />
        </div>

        <div className="col">
          <Cards title="Avg Rating" count={`${(cards.avg_rating_card?.value || 0).toFixed(1)} /5`} percentage={cards.avg_rating_card?.trend?.value || 0} arrow={getTrendSVG(cards.avg_rating_card?.trend?.value || 0)} />
        </div>
      </div>
    );
  };

  /* ---------------- FIND CHARTS ---------------- */
  const dailySentimentChart = charts.find((c: any) => c.id === "daily_sentiment");
  const ratingDistributionChart = charts.find((c: any) => c.id === "rating_distribution");
  const sentimentScoreTrendChart = charts.find((c: any) => c.id === "sentiment_score_trend");

  /* ---------------- WORD CLOUD ---------------- */
  const wordCloudData = Object.entries(data?.wordcloud || {}).map(
    ([text, value]) => ({ text, value: value as number })
  );

  /* ---------------- RENDER ---------------- */
  return (
    <div className="container-fluid">

      {renderCards()}

      <div className="row g-4">

        {/* ✅ DAILY SENTIMENT */}
        {dailySentimentChart && (
          <div className="col-12">
            <ChartCard {...dailySentimentChart} loading={loading}>
              <ChartRenderer 
                chart={dailySentimentChart}
                onDrillDown={onDrillDown} // ✅ FIX
              />
            </ChartCard>
          </div>
        )}

        {/* ✅ RATING */}
        <div className="col-12 col-lg-6">
          {ratingDistributionChart && (
            <ChartCard {...ratingDistributionChart} loading={loading}>
              <ChartRenderer 
                chart={ratingDistributionChart}
                onDrillDown={onDrillDown} // ✅ FIX
              />
            </ChartCard>
          )}
        </div>

        {/* ✅ SENTIMENT TREND */}
        <div className="col-12 col-lg-6">
          {sentimentScoreTrendChart && (
            <ChartCard {...sentimentScoreTrendChart} loading={loading}>
              <ChartRenderer 
                chart={sentimentScoreTrendChart}
                onDrillDown={onDrillDown} // ✅ FIX
              />
            </ChartCard>
          )}
        </div>

        {/* ✅ WORD CLOUD */}
        <div className="col-12 col-lg-6">
          <ChartCard title="Word Cloud" icon="bi bi-cloud" loading={loading}>
            <div style={{ height: 320 }}>
              {wordCloudData.length > 0 ? (
                <WordCloudVisx 
                  data={wordCloudData}
                  onDrillDown={onDrillDown} // ✅ FIX
                />
              ) : (
                <div className="text-center py-4 text-muted">
                  No data
                </div>
              )}
            </div>
          </ChartCard>
        </div>

      </div>
    </div>
  );
};

export default SocialMediaChart;