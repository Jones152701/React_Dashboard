import React from "react";
import ChartCard from "../ChartCard/ChartCard";
import ChartRenderer from "../../ChartRender"; // ✅ IMPORT TYPE
import type { DrillEvent } from "../../ChartRender"; // ✅ IMPORT TYPE
import type { SocialMediaResponse } from "../../../types/socialMedia";

/* ---------------- TYPES ---------------- */

interface Props {
  data: SocialMediaResponse | null;
  loading: boolean;
  onDrillDown?: (event: DrillEvent) => void; // ✅ ADD THIS
}

/* ---------------- COMPONENT ---------------- */

const AiInsightsTab: React.FC<Props> = ({ 
  data, 
  loading, 
  onDrillDown 
}) => {
  const charts = data?.charts || [];

  /* ---------------- GET CHART ---------------- */
  const getChart = (id: string) => charts.find((c) => c.id === id);

  const primaryMentionsChart = getChart("primary_mentions");
  const issueTypeChart = getChart("issue_type");
  const journeyChart = getChart("journey_sentiment");
  const resolutionChart = getChart("resolution_status");
  const valueChart = getChart("value_for_money");
  const churnChart = getChart("churn_risk");

  /* ---------------- CHART RENDER ---------------- */

  const renderChart = (chart: any, fallbackMessage: string = "No data") => {
    if (!chart) {
      return <div className="text-center py-4 text-muted">{fallbackMessage}</div>;
    }

    if (!chart.data || chart.data.length === 0) {
      return (
        <div className="text-center py-4 text-muted">
          No data available for this period
        </div>
      );
    }

    return (
      <ChartRenderer
        chart={chart}
        onDrillDown={onDrillDown} // ✅ CRITICAL FIX
      />
    );
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div className="container-fluid">
      <div className="row g-4">

        {/* Row 1 */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={primaryMentionsChart?.title || "Primary Mentions"}
            tooltip={primaryMentionsChart?.tooltip}
            icon={primaryMentionsChart?.icon || "bi bi-tag-fill"}
            loading={loading}
          >
            {renderChart(primaryMentionsChart, "No primary mentions data")}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard
            title={issueTypeChart?.title || "Issue Type Frequency"}
            tooltip={issueTypeChart?.tooltip}
            icon={issueTypeChart?.icon || "bi bi-exclamation-triangle-fill"}
            loading={loading}
          >
            {renderChart(issueTypeChart, "No issue type data")}
          </ChartCard>
        </div>

        {/* Row 2 */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={journeyChart?.title || "Journey Stage vs Sentiment"}
            tooltip={journeyChart?.tooltip}
            icon={journeyChart?.icon || "bi bi-signpost-split"}
            loading={loading}
          >
            {renderChart(journeyChart, "No journey sentiment data")}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard
            title={resolutionChart?.title || "Resolution Status"}
            tooltip={resolutionChart?.tooltip}
            icon={resolutionChart?.icon || "bi bi-check-circle-fill"}
            loading={loading}
          >
            {renderChart(resolutionChart, "No resolution data")}
          </ChartCard>
        </div>

        {/* Row 3 */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={valueChart?.title || "Value for Money"}
            tooltip={valueChart?.tooltip}
            icon={valueChart?.icon || "bi bi-wallet-fill"}
            loading={loading}
          >
            {renderChart(valueChart, "No value for money data")}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard
            title={churnChart?.title || "Churn Risk"}
            tooltip={churnChart?.tooltip}
            icon={churnChart?.icon || "bi bi-exclamation-octagon-fill"}
            loading={loading}
          >
            {renderChart(churnChart, "No churn risk data")}
          </ChartCard>
        </div>

      </div>
    </div>
  );
};

export default AiInsightsTab;