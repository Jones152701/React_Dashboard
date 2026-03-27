import React from "react";
import ChartRenderer from "../../ChartRender";
import WordCloudVisx from "../../../graphs/WordCloud";
import type { DrillState } from "../../../types/drilldown";
import "./Drilldown.css";

// Review assets
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
      return <img src={postive} width={40} height={40} alt="positive" />;
    if (sentiment === "negative")
      return <img src={negative} width={40} height={40} alt="negative" />;
    return <img src={neutral} width={40} height={40} alt="neutral" />;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const contextLabel = drill.context
    ? `${String(drill.context.key).replace(/_/g, " ")} → ${String(drill.context.value)}`
    : "";

  /* ================= RENDER ================= */

  return (
    <div className="drilldown-overlay" onClick={onClose}>
      <div
        className="drilldown-sidebar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <div className="drilldown-header">
          <div className="drilldown-header-text">
            <h3>
              <i className="bi bi-graph-up-arrow me-2"></i>
              Drilldown Analysis
            </h3>

            {drill.context && (
              <div className="drilldown-badge">
                <i className="bi bi-funnel-fill"></i>
                {contextLabel}
              </div>
            )}
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
              <div className="drill-loader">
                <div className="drill-loader-dot"></div>
                <div className="drill-loader-dot"></div>
                <div className="drill-loader-dot"></div>
              </div>
              <p>Fetching insights…</p>
            </div>
          )}

          {/* ================= DATA ================= */}
          {!drill.loading && drill.data && (
            <>
              {/* ================= KPI CARDS ================= */}
              {drill.data.cards && (
                <div className="drilldown-cards drill-section">
                  <div className="drill-kpi-grid">
                    {[
                      {
                        title: "Total Reviews",
                        value: drill.data.cards.total_reviews?.toLocaleString() || "0",
                      },
                      {
                        title: "Avg Rating",
                        value: `${(drill.data.cards.avg_rating || 0).toFixed(1)} /5`,
                      },
                      {
                        title: "Avg Sentiment",
                        value: (drill.data.cards.avg_sentiment_score || 0).toFixed(2),
                      },
                      {
                        title: "% of Total",
                        value: `${drill.data.cards.percentage_of_total || 0}%`,
                      },
                    ].map((kpi, idx) => (
                      <div key={idx} className="drill-kpi-card">
                        <div className="drill-kpi-label">{kpi.title}</div>
                        <div className="drill-kpi-value">{kpi.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ================= CHARTS ================= */}
              {drill.data.charts?.map((chart: any, idx: number) => (
                <div key={idx} className="drilldown-chart drill-section">
                  <h4 className="drilldown-chart-title">
                    <i
                      className={`bi ${
                        chart.icon || "bi-bar-chart-fill"
                      } drilldown-chart-icon`}
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
                  <div className="drilldown-chart drill-section">
                    <h4 className="drilldown-chart-title">
                      <i className="bi bi-cloud drilldown-chart-icon"></i>
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
                <div className="drilldown-reviews drill-section">
                  <div className="drilldown-reviews-header">
                    <i className="bi bi-chat-square-text drilldown-chart-icon"></i>
                    Reviews
                    <span className="review-count-badge">
                      {drill.data.reviews.length}
                    </span>
                  </div>

                  {drill.data.reviews.map((review: any, index: number) => {
                    const sentimentClass =
                      review.sentiment?.toLowerCase() || "neutral";

                    return (
                      <div key={index} className="drill-review-item">
                        {/* Accent bar */}
                        <div
                          className={`drill-review-accent ${sentimentClass}`}
                        ></div>

                        <div className="d-flex">
                          {/* Emoji */}
                          <div className="drill-review-emoji">
                            {sentimentEmoji(review.sentiment)}
                          </div>

                          {/* Content */}
                          <div className="flex-grow-1">
                            {/* Top row */}
                            <div className="drill-review-top">
                              <div className="drill-review-user">
                                <strong>{review.username}</strong>
                                <span className="drill-review-platform">
                                  {review.platform}
                                </span>
                              </div>

                              <span
                                className={`drill-sentiment-pill ${sentimentClass}`}
                              >
                                {review.sentiment}
                              </span>
                            </div>

                            {/* Body */}
                            <div className="drill-review-text">
                              {review.message}
                            </div>

                            {/* Footer */}
                            <div className="drill-review-footer">
                              <div className="drill-review-meta">
                                <span>{formatDate(review.created_date)}</span>
                                <span>·</span>
                                <span>{review.country}</span>
                                <span className="drill-review-stars">
                                  {renderStars(review.rating)}
                                </span>
                              </div>

                              {review.link && (
                                <a
                                  href={review.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="drill-review-link"
                                >
                                  View Original →
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {!drill.data.cards &&
                !drill.data.charts?.length &&
                !drill.data.reviews?.length && (
                  <div className="drill-empty drill-section">
                    <i className="bi bi-inbox"></i>
                    <p>No drilldown data available for this selection.</p>
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