// drilldown.tsx - COMPLETE FIXED VERSION

import React from "react";
import ChartRenderer from "../../ChartRender";
import WordCloudVisx from "../../../graphs/WordCloud";
import Cards from "../../cards/Cards";
import type { DrillState } from "../../../types/drilldown";
import "./drilldown.css";

interface DrilldownProps {
  drill: DrillState;  // ✅ FIXED: Expect drill object, not individual props
  onClose: () => void;
}

const Drilldown: React.FC<DrilldownProps> = ({ drill, onClose }) => {
  if (!drill.open) return null;

  /* ================= HELPERS ================= */

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

  const convertWordCloud = (obj: Record<string, number>) => {
    return Object.entries(obj || {}).map(([text, value]) => ({
      text,
      value,
    }));
  };

  /* ================= RENDER ================= */

  return (
    <div className="drilldown-overlay" onClick={onClose}>
      <div className="drilldown-sidebar" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="drilldown-header">
          <div>
            <h3>Drilldown Analysis</h3>
            {drill.context && (
              <p className="drilldown-context">
                {drill.context.key}: <strong>{String(drill.context.value)}</strong>
              </p>
            )}
          </div>
          <button className="drilldown-close" onClick={onClose}>✕</button>
        </div>

        {/* CONTENT */}
        <div className="drilldown-content">

          {/* LOADING */}
          {drill.loading && (
            <div className="drilldown-loading">
              <div className="spinner"></div>
              <p>Loading drilldown data...</p>
            </div>
          )}

          {/* DATA */}
          {!drill.loading && drill.data && (
            <>

              {/* KPI CARDS - FIXED STRUCTURE */}
              {drill.data.cards && (
                <div className="drilldown-cards">
                  <div className="row g-3">

                    <div className="col-6">
                      <Cards
                        title="Total Reviews"
                        count={drill.data.cards.total_reviews?.toLocaleString() || "0"}
                        percentage={0}  // No trend for drilldown
                        arrow={getTrendSVG(0)}
                      />
                    </div>

                    <div className="col-6">
                      <Cards
                        title="Avg Rating"
                        count={`${(drill.data.cards.avg_rating || 0).toFixed(1)} /5`}
                        percentage={0}
                        arrow={getTrendSVG(0)}
                      />
                    </div>

                    <div className="col-6">
                      <Cards
                        title="Avg Sentiment Score"
                        count={(drill.data.cards.avg_sentiment_score || 0).toFixed(2)}
                        percentage={0}
                        arrow={getTrendSVG(0)}
                      />
                    </div>

                    <div className="col-6">
                      <Cards
                        title="% of Total"
                        count={`${drill.data.cards.percentage_of_total || 0}%`}
                        percentage={0}
                        arrow={getTrendSVG(0)}
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* CHARTS - WITH PROPER drillKey */}
              {drill.data.charts?.map((chart: any, idx: number) => (
                <div key={idx} className="drilldown-chart">
                  <h4 className="drilldown-chart-title">{chart.title}</h4>

                  <ChartRenderer
                    chart={chart}
                    selectedValue={drill.context?.value}
                    drillKey={chart?.config?.drillKey}  // ✅ Pass drillKey from config
                    onDrillDown={(event) => {
                      console.log("Nested drill:", event);
                      // You can trigger next API call here for deeper drilldown
                    }}
                  />
                </div>
              ))}

              {/* WORD CLOUD */}
              {drill.data.wordcloud && Object.keys(drill.data.wordcloud).length > 0 && (
                <div className="drilldown-chart">
                  <h4 className="drilldown-chart-title">Key Topics</h4>

                  <div style={{ height: 280 }}>
                    <WordCloudVisx
                      data={convertWordCloud(drill.data.wordcloud)}
                      maxWords={50}
                      onDrillDown={(event) => {
                        console.log("Word drill:", event);
                        // Handle word drilldown
                      }}
                    />
                  </div>
                </div>
              )}

              {/* REVIEWS */}
              {drill.data.reviews?.length > 0 && (
                <div className="drilldown-reviews">
                  <h4>Related Reviews ({drill.data.reviews.length})</h4>

                  {drill.data.reviews.map((r: any, i: number) => (
                    <div key={i} className="review-item">
                      <strong>{r.username}</strong> ({r.platform})
                      <p>{r.message}</p>
                    </div>
                  ))}
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