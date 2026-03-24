import React from "react";
import './ChartCard.css'

interface ChartCardProps {
  title: string;
  tooltip?: string;
  icon?: string;
  loading?: boolean;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  tooltip,
  icon = "bi-bar-chart-fill",
  loading = false,
  children,
}) => {
  return (
    <div className="analytics-chart-card">

      {/* Header */}
      <div className="chart-header">

        <div className="chart-title-wrapper">
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
        </div>

        <div className="chart-divider"></div>

      </div>

      {/* Chart */}
      <div className="chart-wrapper">
        <div className={`chart-visualization ${loading ? "loading" : ""}`}>
          {children}
        </div>

        {loading && (
          <div className="chart-loader">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ChartCard;