import React from "react";
import ChartRenderer from "../../ChartRender";
import WordCloudVisx from "../../../graphs/WordCloud";
import Cards from "./cards/cards";
import type { DrillState } from "../../../types/drilldown";
import "./drilldown.css";

// ✅ IMPORT REVIEW STYLES + ASSETS
import "../ReviewTab/ReviewTab.css";
import postive from "../../../assets/images/positive.png";
import negative from "../../../assets/images/negative.png";
import neutral from "../../../assets/images/neutral.png";

interface DrilldownProps {
  drill: DrillState;
  onClose: () => void;
}

const Drilldown: React.FC<DrilldownProps> = ({ drill, onClose }) => {
  if (!drill.open) return null;

  const convertWordCloud = (obj: Record<string, number>) => {
    return Object.entries(obj || {}).map(([text, value]) => ({
      text,
      value,
    }));
  };

  /* ================= HELPERS ================= */

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  const sentimentEmoji = (sentiment?: string) => {
    if (sentiment === "positive")
      return <img src={postive} width={50} height={50} alt="positive" />;
    if (sentiment === "negative")
      return <img src={negative} width={50} height={50} alt="negative" />;
    return <img src={neutral} width={50} height={50} alt="neutral" />;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  /* ================= RENDER ================= */

  return (
    <div className="drilldown-overlay" onClick={onClose}>
      <div
        className="drilldown-sidebar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <div className="drilldown-header">
          <div>
            <h3>
              Drilldown Analysis
              {drill.context &&
                ` of ${drill.context.key}: ${String(
                  drill.context.value
                )}`}
            </h3>
          </div>

          <button className="drilldown-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="drilldown-content">

          {/* ================= LOADING ================= */}
          {drill.loading && (
            <div className="drilldown-loading">
              <div className="spinner"></div>
              <p>Loading drilldown data...</p>
            </div>
          )}

          {/* ================= DATA ================= */}
          {!drill.loading && drill.data && (
            <>
              {/* ================= KPI CARDS ================= */}
              {drill.data.cards && (
                <div className="drilldown-cards">
                  <Cards
                    data={[
                      {
                        title: "Total Reviews",
                        value:
                          drill.data.cards.total_reviews?.toLocaleString() ||
                          "0",
                      },
                      {
                        title: "Avg Rating",
                        value: `${(
                          drill.data.cards.avg_rating || 0
                        ).toFixed(1)} /5`,
                      },
                      {
                        title: "Avg Sentiment Score",
                        value: (
                          drill.data.cards.avg_sentiment_score || 0
                        ).toFixed(2),
                      },
                      {
                        title: "Percentage of Total",
                        value: `${
                          drill.data.cards.percentage_of_total || 0
                        }%`,
                      },
                    ]}
                  />
                </div>
              )}

              {/* ================= CHARTS ================= */}
              {drill.data.charts?.map((chart: any, idx: number) => (
                <div key={idx} className="drilldown-chart">
                  <h4 className="drilldown-chart-title">
                    <i
                      className={`bi ${
                        chart.icon || "bi-bar-chart-fill"
                      } drilldown-chart-icon me-2`}
                    ></i>
                    {chart.title}
                  </h4>

                  <div className="p-4">
                    <ChartRenderer
                    chart={chart}
                    selectedValue={drill.context?.value}
                    drillKey={chart?.config?.drillKey}
                    onDrillDown={(event) => {
                      console.log("Nested drill:", event);
                    }}
                  />
                  </div>
                </div>
              ))}

              {/* ================= WORD CLOUD ================= */}
              {drill.data.wordcloud &&
                Object.keys(drill.data.wordcloud).length > 0 && (
                  <div className="drilldown-chart">
                    <h4 className="drilldown-chart-title">
                      <i className="bi bi-cloud drilldown-chart-icon me-2"></i>
                      Key Topics
                    </h4>

                    <div className="p-3">
                      <WordCloudVisx
                        data={convertWordCloud(drill.data.wordcloud)}
                        maxWords={50}
                        onDrillDown={(event) => {
                          console.log("Word drill:", event);
                        }}
                      />
                    </div>
                  </div>
                )}

              {/* ================= REVIEWS ================= */}
              {drill.data.reviews?.length > 0 && (
                <div className="drilldown-reviews">
                  <h4>
                    Reviews ({drill.data.reviews.length})
                  </h4>

                  {drill.data.reviews.map((review: any, index: number) => {
                    const sentimentClass =
                      review.sentiment?.toLowerCase() || "neutral";

                    return (
                      <div key={index} className="review-item">
                        <div
                          className={`review-bar ${sentimentClass}`}
                        ></div>

                        <div className="review-emoji">
                          {sentimentEmoji(review.sentiment)}
                        </div>

                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center">
                              <strong>{review.username}</strong>

                              <span className="platform-badge badge bg-secondary ms-2">
                                {review.platform}
                              </span>
                            </div>

                            <span
                              className={`sentiment-pill ${sentimentClass}`}
                            >
                              {review.sentiment}
                            </span>
                          </div>

                          <div className="review-text">
                            {review.message}
                          </div>

                          <div className="review-footer">
                            <div className="review-meta">
                              <strong>
                                {formatDate(review.created_date)}
                              </strong>{" "}
                              –
                              <strong>
                                {review.country}
                                <span className="review-stars ms-1">
                                  {renderStars(review.rating)}
                                </span>
                              </strong>
                            </div>

                            {review.link && (
                              <a
                                href={review.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View Original
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drilldown;