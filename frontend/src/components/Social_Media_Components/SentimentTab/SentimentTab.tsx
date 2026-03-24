import React from "react";
import {
  BarChart,
  Bar,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Label
} from "recharts";

import ChartCard from "../ChartCard/ChartCard";
import WordCloudSVG from "../../word-cloud/WordCloud";
import Cards from "../../cards/Cards";
import type { SocialMediaResponse } from "../../../types/socialMedia";
import './SentimentTab.css'

/* ---------------- Interfaces ---------------- */

interface SentimentData {
  day: string;
  positive: number;
  neutral: number;
  negative: number;
}

type RatingData = {
  rating: number;
  count: number;
};

type ScoreTrendData = {
  day: string;
  score: number;
};

type WordCloudData = {
  text: string;
  value: number;
};

type HashtagData = {
  text: string;
  value: number;
};

type CardsData = {
  reviews: {
    value: number;
    change: number;
  };
  positive: {
    value: number;
    change: number;
  };
  neutral: {
    value: number;
    change: number;
  };
  negative: {
    value: number;
    change: number;
  };
  avg_rating: {
    value: number;
    change: number;
  };
};

interface Props {
  data: SocialMediaResponse | null;
  loading: boolean;
}

/* ---------------- Tooltip ---------------- */

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const positive = payload.find((p: any) => p.dataKey === "positive")?.value || 0;
  const neutral = payload.find((p: any) => p.dataKey === "neutral")?.value || 0;
  const negative = payload.find((p: any) => p.dataKey === "negative")?.value || 0;

  const total = positive + neutral + negative;

  const date = new Date(label).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        padding: "10px 12px",
        borderRadius: "8px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
        fontSize: "13px"
      }}
    >
      <strong>{date}</strong>

      <div style={{ marginTop: 6 }}>
        <div style={{ color: "#22c55e" }}>Positive: {positive}</div>
        <div style={{ color: "#6b7280" }}>Neutral: {neutral}</div>
        <div style={{ color: "#ef4444" }}>Negative: {negative}</div>

        <hr style={{ margin: "6px 0" }} />

        <strong>Total: {total}</strong>
      </div>
    </div>
  );
};

/* ---------------- Simplified Arrow SVG Helper ---------------- */

const getTrendSVG = (trendValue: number) => {
  const isPositive = trendValue > 0;
  const isNegative = trendValue < 0;

  const color = isPositive
    ? "#198754"   // green
    : isNegative
      ? "#dc3545"   // red
      : "gray";

  const points = isPositive
    ? "1,20 10,10 18,15 39,2"     // up
    : isNegative
      ? "1,4 10,14 18,9 39,22"      // down
      : "1,12 39,12";               // flat

  const arrow = isPositive
    ? "30,2 39,2 39,10"
    : isNegative
      ? "30,22 39,22 39,14"
      : "33,7 39,12 33,17";

  return (
    <svg width="56" height="40" viewBox="0 0 40 24">
      <polyline
        points={points}
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <polyline
        points={arrow}
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

/* ---------------- Component ---------------- */

const SocialMediaChart: React.FC<Props> = ({ data, loading }) => {
  // Extract data from props with proper typing
  const sentimentData = (data?.daily_sentiment || []) as SentimentData[];
  const ratingData = (data?.rating_distribution || []) as RatingData[];
  const scoreTrendData = (data?.sentiment_score_trend || []) as ScoreTrendData[];

  // Process cards data with proper typing
  const cardsData: CardsData | null = data?.cards ? {
    reviews: {
      value: data.cards.total_reviews_card?.count || 0,
      change: data.cards.total_reviews_card?.trend?.value || 0
    },
    positive: {
      value: data.cards.positive_card?.count || 0,
      change: data.cards.positive_card?.trend?.value || 0
    },
    neutral: {
      value: data.cards.neutral_card?.count || 0,
      change: data.cards.neutral_card?.trend?.value || 0
    },
    negative: {
      value: data.cards.negative_card?.count || 0,
      change: data.cards.negative_card?.trend?.value || 0
    },
    avg_rating: {
      value: data.cards.avg_rating_card?.value || 0,
      change: data.cards.avg_rating_card?.trend?.value || 0
    }
  } : null;

  // Process word cloud data with proper typing
  const wordCloudData: WordCloudData[] = Object.entries(data?.wordcloud || {})
    .map(([text, value]) => ({
      text,
      value: value as number
    }))
    .sort((a, b) => b.value - a.value);

  // Process hashtags with proper typing
  const hashtags: HashtagData[] = Object.entries(data?.top_hashtags || {})
    .map(([text, value]) => ({
      text: (text as string).replace("#", ""),
      value: value as number
    }))
    .sort((a, b) => b.value - a.value);

  /* ---------------- Render Cards Section ---------------- */

  const renderCards = () => {
    if (loading) {
      return (
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4, 5].map((_, i) => (
            <div key={i} className="col-12 col-md-6 col-xl">
              <div className="card p-3" style={{ height: 100, opacity: 0.6 }}>
                Loading...
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!cardsData) return null;

    return (
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-xl">
          <Cards
            title="Reviews"
            count={cardsData.reviews.value.toLocaleString()}
            percentage={cardsData.reviews.change}
            arrow={getTrendSVG(cardsData.reviews.change)}
          />
        </div>

        <div className="col-12 col-md-6 col-xl">
          <Cards
            title="Positive"
            count={cardsData.positive.value.toLocaleString()}
            percentage={cardsData.positive.change}
            arrow={getTrendSVG(cardsData.positive.change)}
          />
        </div>

        <div className="col-12 col-md-6 col-xl">
          <Cards
            title="Neutral"
            count={cardsData.neutral.value.toLocaleString()}
            percentage={cardsData.neutral.change}
            arrow={getTrendSVG(cardsData.neutral.change)}
          />
        </div>

        <div className="col-12 col-md-6 col-xl">
          <Cards
            title="Negative"
            count={cardsData.negative.value.toLocaleString()}
            percentage={cardsData.negative.change}
            arrow={getTrendSVG(cardsData.negative.change)}
          />
        </div>

        <div className="col-12 col-md-6 col-xl">
          <Cards
            title="Avg. Rating"
            count={`${cardsData.avg_rating.value.toFixed(1)} /5`}
            percentage={cardsData.avg_rating.change}
            arrow={getTrendSVG(cardsData.avg_rating.change)}
          />
        </div>
      </div>
    );
  };

  /* ---------------- Sentiment Chart ---------------- */

  const renderSentimentChart = () => {
    if (!sentimentData.length) return null;

    const maxValue = Math.max(
      ...sentimentData.map((d: SentimentData) => d.positive + d.neutral + d.negative)
    );

    const yMax = Math.ceil(maxValue / 50) * 50;

    return (
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <ResponsiveContainer width="95%" height={350}>
          <BarChart
            data={sentimentData}
            margin={{ top: 30, right: 20, left: 30, bottom: 25 }}
          >
            <CartesianGrid vertical={false} />

            <XAxis
              dataKey="day"
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short"
                })
              }
            >
              <Label value="Date" position="insideBottom" offset={-43} />
            </XAxis>

            <YAxis
              domain={[0, yMax]}
              axisLine={false}
              tickLine={false}
            >
              <Label
                value="Number of Reviews"
                angle={-90}
                position="insideLeft"
                offset={-10}
                style={{ textAnchor: "middle" }}
              />
            </YAxis>

            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Legend />

            <Bar dataKey="positive" stackId="a" fill="#22c55e" />
            <Bar dataKey="neutral" stackId="a" fill="#6b7280" />
            <Bar dataKey="negative" stackId="a" fill="#ef4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  /* ---------------- Rating Chart ---------------- */

  const renderRatingChart = () => {
    if (!ratingData.length) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={ratingData}
          margin={{ top: 30, right: 20, left: 30, bottom: 25 }}
        >
          <CartesianGrid vertical={false} />

          <XAxis dataKey="rating" tickFormatter={(r) => `${r}★`}>
            <Label value="Rating" position="insideBottom" offset={-20} />
          </XAxis>

          <YAxis axisLine={false} tickLine={false}>
            <Label
              value="Count"
              angle={-90}
              position="insideLeft"
              offset={-10}
              style={{ textAnchor: "middle" }}
            />
          </YAxis>

          <Tooltip cursor={false} />

          <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* ---------------- Score Trend Chart ---------------- */

  const renderScoreTrendChart = () => {
    if (!scoreTrendData.length) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={scoreTrendData} margin={{ top: 30, right: 20, left: 30, bottom: 25 }}>
          <CartesianGrid vertical={false} />

          <XAxis
            dataKey="day"
            tickFormatter={(date) =>
              new Date(date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short"
              })
            }
          >
            <Label value="Date" position="insideBottom" offset={-20} />
          </XAxis>

          <YAxis domain={[-1, 1]} axisLine={false} tickLine={false}>
            <Label
              value="Sentiment Score"
              angle={-90}
              offset={-10}
              position="insideLeft"
              style={{ textAnchor: "middle" }}
            />
          </YAxis>

          <Tooltip cursor={false} />

          <Area
            type="monotone"
            dataKey="score"
            stroke="#6366f1"
            fill="#c7d2fe"
            strokeWidth={3}
            dot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  /* ---------------- Word Cloud ---------------- */

  const renderWordCloud = () => {
    if (!wordCloudData.length) {
      return (
        <div className="text-center py-4 text-muted">
          No word cloud data available
        </div>
      );
    }

    return <WordCloudSVG data={wordCloudData} />;
  };

  /* ---------------- Hashtags ---------------- */

  const renderHashtags = () => {
    if (!hashtags.length) {
      return (
        <div className="text-center py-4 text-muted">
          No hashtags found
        </div>
      );
    }

    return (
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
    );
  };

  return (
    <div className="container-fluid">
      {/* Cards Section - Now at the top */}
      {renderCards()}

      <div className="row g-4">
        <div className="col-12">
          <ChartCard
            title="Daily Sentiment Analysis"
            tooltip="Stacked bars: Daily sentiment volume"
            icon="bi bi-bar-chart-line-fill"
            loading={loading}
          >
            {renderSentimentChart()}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard
            title="Rating Distribution"
            tooltip="Distribution of ratings from 1 to 5"
            icon="bi bi-star-fill"
            loading={loading}
          >
            {renderRatingChart()}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard
            title="Sentiment Score Trend"
            tooltip="Average sentiment score over time"
            icon="bi bi-graph-up"
            loading={loading}
          >
            {renderScoreTrendChart()}
          </ChartCard>
        </div>

        {/* Word Cloud Row */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title="Word Cloud"
            tooltip="Most frequent words in reviews"
            icon="bi bi-cloud"
            loading={loading}
          >
            <div style={{ height: 400 }}>
              {renderWordCloud()}
            </div>
          </ChartCard>
        </div>

        {/* Top 10 Hashtags */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title="Top 10 Hashtags"
            tooltip="Most used hashtags in reviews"
            icon="bi bi-hash"
            loading={loading}
          >
            {renderHashtags()}
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaChart;