import React from "react";
import "./Cards.css";

interface Props {
  title: string;
  count: string | number;
  percentage: number;
  arrow: React.ReactNode;
  highlight?: "green" | "red" | "default";
  showStars?: boolean;
  loading?: boolean;
}

const Cards: React.FC<Props> = ({
  title,
  count,
  percentage,
  arrow,
  highlight = "default",
  showStars = false,
  loading = false,
}) => {
  const isPositive = percentage > 0;
  const isNegative = percentage < 0;

  const getCountColor = () => {
    if (highlight === "green") return "text-success";
    if (highlight === "red") return "text-danger";
    return "text-gray-900";
  };

  // FIXED: Robust star rendering that handles all cases
  const renderStars = () => {
    // Convert count to number, default to 0 if invalid
    const rating = Number(count) || 0;
    
    // Debug - remove in production
    console.log("Rating count:", count, "Parsed as:", rating);

    // Calculate full and empty stars
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;

    return (
      <div className="text-warning text-sm mt-1">
        {"★".repeat(fullStars)}
        {"☆".repeat(emptyStars)}
      </div>
    );
  };

  /* ── Skeleton state ── */

  if (loading) {
    return (
      <div className="h-100 shadow-sm rounded-3 bg-white" style={{ cursor: "default" }}>
        <div className="d-flex align-items-center p-3 card-skeleton-wrap">

          {/* LEFT */}
          <div style={{ flex: "0 0 60%" }} className="pe-2">
            <div className="card-skel-title"></div>
            <div className="card-skel-value"></div>
            <div className="card-skel-badge"></div>
          </div>

          {/* RIGHT — trend line placeholder */}
          <div
            style={{ flex: "0 0 40%" }}
            className="d-flex justify-content-end align-items-center ps-2"
          >
            <div className="card-skel-trend"></div>
          </div>

          {/* Shimmer */}
          <div className="card-skel-shimmer"></div>
        </div>
      </div>
    );
  }

  /* ── Normal state ── */

  return (
    <div className="h-100 shadow-sm rounded-3 bg-white" style={{ cursor: "pointer" }}>
      <div className="d-flex align-items-center p-3">

        {/* LEFT → EXACT 60% */}
        <div style={{ flex: "0 0 60%" }} className="pe-2">

          {/* Title */}
          <div className="h6 mb-1 text-gray-600">
            {title}
          </div>

          {/* Value */}
          <div className={`h4 mb-1 fw-bold ${getCountColor()}`}>
            {count}
          </div>

          {/* Badge OR Stars - FIXED with proper Bootstrap classes */}
          <div className="mt-1">
            {showStars ? (
              <>
                {renderStars()}
                <div className="text-xs text-muted mt-1">
                  {count} / 5
                </div>
              </>
            ) : (
              <span
                className={`badge px-2 py-1 ${
                  isPositive
                    ? "bg-success-subtle text-success"
                    : isNegative
                    ? "bg-danger-subtle text-danger"
                    : "bg-light text-muted"
                }`}
              >
                {isPositive ? "+" : ""}
                {percentage}%
              </span>
            )}
          </div>

        </div>

        {/* RIGHT → EXACT 40% */}
        <div
          style={{ flex: "0 0 40%" }}
          className="d-flex justify-content-end align-items-center ps-2"
        >
          {arrow}
        </div>

      </div>
    </div>
  );
};

export default Cards;