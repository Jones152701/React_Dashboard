// drilldown.tsx - COMPLETE FIXED VERSION

import React from "react";
import ChartRenderer from "../../ChartRender";
import WordCloudVisx from "../../../graphs/WordCloud";
import Cards from "./cards/cards";
import type { DrillState } from "../../../types/drilldown";
import "./drilldown.css";

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

  /* ================= RENDER ================= */

  return (
    <div className="drilldown-overlay" onClick={onClose}>
      <div
        className="drilldown-sidebar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="drilldown-header">
          <div>
            <h3>Drilldown Analysis
              {drill.context && (
              <p className="drilldown-context">
                {drill.context.key}:{" "}
                <strong>{String(drill.context.value)}</strong>
              </p>
            )}
            </h3>
            
          </div>
          <button className="drilldown-close" onClick={onClose}>
            ✕
          </button>
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
              {/* ✅ KPI CARDS — FIXED */}
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

              {/* CHARTS */}
              {drill.data.charts?.map((chart: any, idx: number) => (
                <div key={idx} className="drilldown-chart">
                  <h4 className="drilldown-chart-title">
                    {chart.title}
                  </h4>

                  <ChartRenderer
                    chart={chart}
                    selectedValue={drill.context?.value}
                    drillKey={chart?.config?.drillKey}
                    onDrillDown={(event) => {
                      console.log("Nested drill:", event);
                    }}
                  />
                </div>
              ))}

              {/* WORD CLOUD */}
              {drill.data.wordcloud &&
                Object.keys(drill.data.wordcloud).length > 0 && (
                  <div className="drilldown-chart">
                    <h4 className="drilldown-chart-title">
                      Key Topics
                    </h4>

                    <div style={{ height: 280 }}>
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

              {/* REVIEWS */}
              {drill.data.reviews?.length > 0 && (
                <div className="drilldown-reviews">
                  <h4>
                    Related Reviews ({drill.data.reviews.length})
                  </h4>

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