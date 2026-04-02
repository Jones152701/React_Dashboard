import React, { useState, useEffect, useCallback, useRef } from "react";
import ChartRenderer from "../../ChartRender";
import WordCloudVisx from "../../../graphs/WordCloud";
import type { DrillState, DrillReview, DrillFetchParams } from "../../../types/drilldown";
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

type WordCloudConfig = {
  minFontSize?: number;
  maxFontSize?: number;
  padding?: number;
  colors?: string[];
};

const Drilldown: React.FC<DrilldownProps> = ({ drill, onClose }) => {
  /* ── Delayed unmount for exit animation ── */
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  /* ── Pagination state ── */
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const reviewsRef = useRef<HTMLDivElement>(null);

  /* ── Delay chart render until sidebar animation completes ── */
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    if (drill.open) {
      setVisible(true);
      setIsClosing(false);
      setChartsReady(false);
      // Wait for sidebar slide-in to finish before rendering charts
      const t = setTimeout(() => setChartsReady(true), 420);
      return () => clearTimeout(t);
    } else if (visible) {
      // Play close animation, then unmount
      setIsClosing(true);
      setChartsReady(false);
      const timer = setTimeout(() => {
        setVisible(false);
        setIsClosing(false);
      }, 400); // matches CSS animation duration
      return () => clearTimeout(timer);
    }
  }, [drill.open, visible]);

  /* ── Sync current page with drill data ── */
  useEffect(() => {
    if (drill.data?.pagination?.current_page) {
      setCurrentPage(drill.data.pagination.current_page);
    } else if (drill.data?.pagination) {
      setCurrentPage(1);
    }
    // Clear reviews loading and scroll to top of reviews
    if (reviewsLoading) {
      setReviewsLoading(false);
      // Scroll to reviews section after data loads
      setTimeout(() => {
        reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [drill.data]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 380);
  }, [onClose]);

  /* ── Page change handler with proper types ── */
  const handlePageChange = useCallback((page: number) => {
    const totalPages = drill.data?.pagination?.total_pages || 1;

    if (page < 1 || page > totalPages) return;

    setCurrentPage(page);
    setReviewsLoading(true);

    // ✅ Properly typed fetch call
    if (drill.fetch) {
      const params: DrillFetchParams = {
        page,
        type: "drilldown",
        context: drill.context ? {
          key: drill.context.key,
          value: drill.context.value
        } : undefined
      };
      drill.fetch(params);
    } else {
      console.warn("drill.fetch is not defined");
    }
  }, [drill]);

  if (!visible) return null;

  /* ================= HELPER FUNCTIONS ================= */

  const convertWordCloud = (obj: Record<string, number>) => {
    return Object.entries(obj || {}).map(([text, value]) => ({
      text,
      value,
    }));
  };

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

  const formatText = (text: string): string =>
    String(text)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase());

  const contextLabel = drill.context
    ? `${formatText(drill.context.key)} → ${formatText(drill.context.value)}`
    : "";

  /* ================= WORD CLOUD HANDLERS ================= */

  const isWordCloudObject = (
    wc: any
  ): wc is { data: Record<string, number>; config?: WordCloudConfig } => {
    return (
      wc &&
      typeof wc === "object" &&
      !Array.isArray(wc) &&
      "data" in wc &&
      typeof wc.data === "object"
    );
  };

  const getWordCloudData = () => {
    const wc = drill.data?.wordcloud;

    if (!wc) return [];

    if (isWordCloudObject(wc)) {
      return convertWordCloud(wc.data);
    }

    if (typeof wc === "object" && wc !== null) {
      return convertWordCloud(wc as Record<string, number>);
    }

    return [];
  };

  const getWordCloudConfig = (): Required<WordCloudConfig> => {
    const defaults = {
      minFontSize: 10,
      maxFontSize: 30,
      padding: 0.5,
      colors: ["#6366F1", "#8B5CF6", "#3B82F6", "#0EA5E9", "#14B8A6"],
    };

    const wc = drill.data?.wordcloud;

    if (isWordCloudObject(wc)) {
      return { ...defaults, ...(wc.config || {}) };
    }

    return defaults;
  };

  const wordCloudData = getWordCloudData();
  const wordCloudConfig = getWordCloudConfig();

  /* ================= REVIEW SKELETON ================= */
  const renderReviewSkeletons = (count: number = 5) => (
    Array.from({ length: count }).map((_, i) => (
      <div key={`skel-${i}`} className="drill-review-item drill-review-skeleton">
        <div className="drill-review-accent neutral"></div>
        <div className="d-flex">
          <div className="drill-review-emoji">
            <div className="skel-circle"></div>
          </div>
          <div className="flex-grow-1">
            <div className="drill-review-top">
              <div className="drill-review-user">
                <div className="skel-bar skel-name"></div>
                <div className="skel-bar skel-badge"></div>
              </div>
              <div className="skel-bar skel-pill"></div>
            </div>
            <div className="skel-bar skel-text-long"></div>
            <div className="skel-bar skel-text-medium"></div>
            <div className="drill-review-footer">
              <div className="drill-review-meta">
                <div className="skel-bar skel-meta"></div>
                <div className="skel-bar skel-meta-short"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ))
  );

  /* ================= PAGINATION HELPERS (FIXED TYPES) ================= */
  const renderPageNumbers = (): React.ReactNode[] => {
    const totalPages = drill.data?.pagination?.total_pages || 1;
    const current = currentPage;

    // Show limited page numbers with ellipsis
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots.map((page, index): React.ReactNode => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${index}`} className="drill-pagination-ellipsis">
            ...
          </span>
        );
      }

      const pageNum = page as number;
      return (
        <button
          key={pageNum}
          className={`drill-page-btn ${pageNum === current ? 'active' : ''}`}
          onClick={() => handlePageChange(pageNum)}
        >
          {pageNum}
        </button>
      );
    });
  };

  /* ================= RENDER ================= */

  return (
    <div
      className={`drilldown-overlay ${isClosing ? "drilldown-overlay--closing" : ""
        }`}
      onClick={handleClose}
    >
      <div
        className={`drilldown-sidebar ${isClosing ? "drilldown-sidebar--closing" : ""
          }`}
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

          <button className="drilldown-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="drilldown-content">
          {/* ================= LOADING (initial only — no data yet) ================= */}
          {drill.loading && !drill.data && (
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
          {drill.data && (
            <>
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
                        className={`bi ${chart.icon || "bi-bar-chart-fill"
                          } drilldown-chart-icon`}
                      ></i>
                      {chart.title}
                    </h4>

                    <div className="p-4">
                      {chartsReady ? (
                        <ChartRenderer
                          chart={chart}
                          selectedValue={drill.context?.value}
                          drillKey={chart?.config?.drillKey}
                          onDrillDown={(event) => {
                            console.log("Nested drill:", event);
                          }}
                        />
                      ) : (
                        <div className="drill-chart-skeleton" style={{ height: chart.config?.height || 300 }}>
                          <div className="skel-bar skel-chart-bar" style={{ width: '60%', height: 8 }}></div>
                          <div className="skel-bar skel-chart-bar" style={{ width: '80%', height: 8 }}></div>
                          <div className="skel-bar skel-chart-bar" style={{ width: '45%', height: 8 }}></div>
                          <div className="skel-bar skel-chart-bar" style={{ width: '70%', height: 8 }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* ================= WORD CLOUD ================= */}
                {wordCloudData.length > 0 && (
                  <div className="drilldown-chart drill-section">
                    <h4 className="drilldown-chart-title">
                      <i className="bi bi-cloud drilldown-chart-icon"></i>
                      Key Topics
                    </h4>

                    <div className="p-3">
                      <WordCloudVisx
                        data={wordCloudData}
                        onDrillDown={(event) => {
                          console.log("Word drill:", event);
                        }}
                        minFontSize={wordCloudConfig.minFontSize}
                        maxFontSize={wordCloudConfig.maxFontSize}
                        padding={wordCloudConfig.padding}
                        colors={wordCloudConfig.colors}
                        selectedValue={drill.context?.value}
                      />
                    </div>
                  </div>
                )}

                {/* ================= REVIEWS ================= */}
                {drill.data.reviews && drill.data.reviews.length > 0 && (
                  <>
                    <div ref={reviewsRef} className="drilldown-reviews drill-section">
                      <div className="drilldown-reviews-header">
                        <i className="bi bi-chat-square-text drilldown-chart-icon"></i>
                        Reviews
                        <span className="review-count-badge">
                          {drill.data.pagination?.total_reviews?.toLocaleString() || drill.data.reviews.length}
                        </span>
                      </div>

                      {/* ✅ Skeleton loader during pagination */}
                      {reviewsLoading ? (
                        renderReviewSkeletons(5)
                      ) : (
                        drill.data.reviews.map((review: DrillReview, index: number) => {
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
                                      <span>{formatDate(review.created_date || review.date)}</span>
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
                        })
                      )}
                    </div>

                    {/* ================= PAGINATION ================= */}
                    {drill.data.pagination && drill.data.pagination.total_pages > 1 && (
                      <div className="drill-pagination-wrapper">
                        <div className="drill-pagination">
                          {/* Previous button */}
                          <button
                            className="drill-page-nav"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <i className="bi bi-chevron-left"></i>
                            Previous
                          </button>

                          {/* Page numbers */}
                          <div className="drill-page-numbers">
                            {renderPageNumbers()}
                          </div>

                          {/* Next button */}
                          <button
                            className="drill-page-nav"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === (drill.data.pagination.total_pages || 1)}
                          >
                            Next
                            <i className="bi bi-chevron-right"></i>
                          </button>
                        </div>

                        {/* Page info */}
                        <div className="drill-pagination-info">
                          Showing page {currentPage} of {drill.data.pagination.total_pages}
                          {drill.data.pagination.total_reviews &&
                            ` (${drill.data.pagination.total_reviews.toLocaleString()} total reviews)`
                          }
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Empty state */}
                {!drill.data.cards &&
                  !drill.data.charts?.length &&
                  (!drill.data.reviews || drill.data.reviews.length === 0) && (
                    <div className="drill-empty drill-section">
                      <i className="bi bi-inbox"></i>
                      <p>No drilldown data available for this selection.</p>
                    </div>
                  )}
              </>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drilldown;