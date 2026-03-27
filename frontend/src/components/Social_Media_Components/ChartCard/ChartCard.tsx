import React from "react";
import './ChartCard.css'

interface ChartCardProps {
  title: string;
  tooltip?: string;
  icon?: string;
  loading?: boolean;
  children: React.ReactNode;
}

/* ── SVG-based skeleton shapes ── */

const BarChartSkeleton = () => (
  <svg viewBox="0 0 300 180" className="skeleton-svg" preserveAspectRatio="none">
    {/* Y-axis grid lines */}
    <line x1="40" y1="10"  x2="290" y2="10"  className="skeleton-grid" />
    <line x1="40" y1="52"  x2="290" y2="52"  className="skeleton-grid" />
    <line x1="40" y1="94"  x2="290" y2="94"  className="skeleton-grid" />
    <line x1="40" y1="136" x2="290" y2="136" className="skeleton-grid" />

    {/* Y-axis labels */}
    <rect x="5"  y="6"   width="28" height="8"  rx="4" className="skeleton-fill" />
    <rect x="5"  y="48"  width="28" height="8"  rx="4" className="skeleton-fill" />
    <rect x="5"  y="90"  width="28" height="8"  rx="4" className="skeleton-fill" />
    <rect x="10" y="132" width="22" height="8"  rx="4" className="skeleton-fill" />

    {/* Bars */}
    <rect x="55"  y="52"  width="24" height="84" rx="4" className="skeleton-bar-fill" />
    <rect x="95"  y="30"  width="24" height="106" rx="4" className="skeleton-bar-fill" />
    <rect x="135" y="70"  width="24" height="66" rx="4" className="skeleton-bar-fill" />
    <rect x="175" y="20"  width="24" height="116" rx="4" className="skeleton-bar-fill" />
    <rect x="215" y="55"  width="24" height="81" rx="4" className="skeleton-bar-fill" />
    <rect x="255" y="40"  width="24" height="96" rx="4" className="skeleton-bar-fill" />

    {/* X-axis line */}
    <line x1="40" y1="140" x2="290" y2="140" className="skeleton-axis" />

    {/* X-axis labels */}
    <rect x="55"  y="148" width="24" height="7" rx="3" className="skeleton-fill" />
    <rect x="95"  y="148" width="24" height="7" rx="3" className="skeleton-fill" />
    <rect x="135" y="148" width="24" height="7" rx="3" className="skeleton-fill" />
    <rect x="175" y="148" width="24" height="7" rx="3" className="skeleton-fill" />
    <rect x="215" y="148" width="24" height="7" rx="3" className="skeleton-fill" />
    <rect x="255" y="148" width="24" height="7" rx="3" className="skeleton-fill" />

    {/* Legend */}
    <rect x="80"  y="166" width="10" height="10" rx="2" className="skeleton-fill" />
    <rect x="95"  y="168" width="35" height="6"  rx="3" className="skeleton-fill" />
    <rect x="155" y="166" width="10" height="10" rx="2" className="skeleton-fill" />
    <rect x="170" y="168" width="35" height="6"  rx="3" className="skeleton-fill" />
  </svg>
);

const PieChartSkeleton = () => (
  <svg viewBox="0 0 300 180" className="skeleton-svg" preserveAspectRatio="xMidYMid meet">
    {/* Donut ring */}
    <circle cx="150" cy="80" r="62" className="skeleton-ring" />
    <circle cx="150" cy="80" r="38" fill="#fff" />

    {/* Slice lines */}
    <line x1="150" y1="18"  x2="150"  y2="42"  className="skeleton-slice" />
    <line x1="204" y1="53"  x2="184"  y2="63"  className="skeleton-slice" />
    <line x1="204" y1="107" x2="184"  y2="97"  className="skeleton-slice" />
    <line x1="96"  y1="107" x2="116"  y2="97"  className="skeleton-slice" />

    {/* Legend */}
    <rect x="60"  y="158" width="10" height="10" rx="5" className="skeleton-fill" />
    <rect x="75"  y="160" width="30" height="6"  rx="3" className="skeleton-fill" />
    <rect x="125" y="158" width="10" height="10" rx="5" className="skeleton-fill" />
    <rect x="140" y="160" width="30" height="6"  rx="3" className="skeleton-fill" />
    <rect x="190" y="158" width="10" height="10" rx="5" className="skeleton-fill" />
    <rect x="205" y="160" width="30" height="6"  rx="3" className="skeleton-fill" />
  </svg>
);

const AreaChartSkeleton = () => (
  <svg viewBox="0 0 300 180" className="skeleton-svg" preserveAspectRatio="none">
    {/* Y-axis grid lines */}
    <line x1="40" y1="15"  x2="290" y2="15"  className="skeleton-grid" />
    <line x1="40" y1="50"  x2="290" y2="50"  className="skeleton-grid" />
    <line x1="40" y1="85"  x2="290" y2="85"  className="skeleton-grid" />
    <line x1="40" y1="120" x2="290" y2="120" className="skeleton-grid" />

    {/* Y-axis labels */}
    <rect x="5"  y="11"  width="28" height="8" rx="4" className="skeleton-fill" />
    <rect x="5"  y="46"  width="28" height="8" rx="4" className="skeleton-fill" />
    <rect x="5"  y="81"  width="28" height="8" rx="4" className="skeleton-fill" />
    <rect x="10" y="116" width="22" height="8" rx="4" className="skeleton-fill" />

    {/* Area fill */}
    <path
      d="M40,110 Q80,60 120,80 T200,40 T290,70 L290,135 L40,135 Z"
      className="skeleton-area-fill"
    />

    {/* Area line */}
    <path
      d="M40,110 Q80,60 120,80 T200,40 T290,70"
      className="skeleton-area-line"
    />

    {/* X-axis */}
    <line x1="40" y1="135" x2="290" y2="135" className="skeleton-axis" />

    {/* X-axis labels */}
    <rect x="50"  y="143" width="30" height="7" rx="3" className="skeleton-fill" />
    <rect x="105" y="143" width="30" height="7" rx="3" className="skeleton-fill" />
    <rect x="160" y="143" width="30" height="7" rx="3" className="skeleton-fill" />
    <rect x="215" y="143" width="30" height="7" rx="3" className="skeleton-fill" />
    <rect x="260" y="143" width="24" height="7" rx="3" className="skeleton-fill" />

    {/* Legend */}
    <rect x="100" y="164" width="10" height="10" rx="2" className="skeleton-fill" />
    <rect x="115" y="166" width="35" height="6"  rx="3" className="skeleton-fill" />
    <rect x="170" y="164" width="10" height="10" rx="2" className="skeleton-fill" />
    <rect x="185" y="166" width="35" height="6"  rx="3" className="skeleton-fill" />
  </svg>
);

const TreemapSkeleton = () => (
  <svg viewBox="0 0 300 180" className="skeleton-svg" preserveAspectRatio="none">
    {/* Large blocks */}
    <rect x="5"   y="5"   width="140" height="100" rx="6" className="skeleton-bar-fill" />
    <rect x="150" y="5"   width="145" height="55"  rx="6" className="skeleton-fill" />
    <rect x="150" y="65"  width="70"  height="40"  rx="6" className="skeleton-bar-fill" />
    <rect x="225" y="65"  width="70"  height="40"  rx="6" className="skeleton-fill" />

    {/* Bottom row */}
    <rect x="5"   y="110" width="95"  height="60"  rx="6" className="skeleton-fill" />
    <rect x="105" y="110" width="95"  height="60"  rx="6" className="skeleton-bar-fill" />
    <rect x="205" y="110" width="90"  height="60"  rx="6" className="skeleton-fill" />
  </svg>
);

/* ── Map skeleton type to chart type ── */

const SKELETON_MAP: Record<string, React.FC> = {
  bar:     BarChartSkeleton,
  pie:     PieChartSkeleton,
  area:    AreaChartSkeleton,
  treemap: TreemapSkeleton,
};

const ChartCard: React.FC<ChartCardProps & { skeletonType?: string }> = ({
  title,
  tooltip,
  icon = "bi-bar-chart-fill",
  loading = false,
  skeletonType = "bar",
  children,
}) => {

  const SkeletonComponent = SKELETON_MAP[skeletonType] || BarChartSkeleton;

  return (
    <div className="analytics-chart-card">

      {/* Header */}
      <div className="chart-header">

        <div className="chart-title-wrapper">
          {loading ? (
            <div className="skeleton-title-pill"></div>
          ) : (
            <>
              <i className={`bi ${icon} chart-icon`}></i>
              <h3 className="chart-title">{title}</h3>

              {tooltip && (
                <div className="info-tooltip">
                  <i className="bi bi-info-circle-fill info-icon"></i>

                  <div className="tooltip-box">
                    {tooltip}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="chart-divider"></div>

      </div>

      {/* Chart */}
      <div className="chart-wrapper">
        {loading ? (
          <div className="skeleton-container">
            <SkeletonComponent />
            {/* Shimmer overlay */}
            <div className="skeleton-shimmer"></div>
          </div>
        ) : (
          <div className="chart-visualization">
            {children}
          </div>
        )}
      </div>

    </div>
  );
};

export default ChartCard;