import React from "react";
import ChartCard from "../ChartCard/ChartCard";
import ChartRenderer from "../../ChartRender";
import type { SocialMediaResponse } from "../../../types/socialMedia";

interface Props {
  data: SocialMediaResponse | null;
  loading: boolean;
}

const AiInsightsTab: React.FC<Props> = ({ data, loading }) => {
  const charts = data?.charts || [];

  // Helper to get chart by ID
  const getChart = (id: string) => charts.find((c) => c.id === id);

  // Get all charts for AI Insights
  const primaryMentionsChart = getChart("primary_mentions");
  const issueTypeChart = getChart("issue_type");
  const journeyChart = getChart("journey_sentiment");
  const resolutionChart = getChart("resolution_status");
  const valueChart = getChart("value_for_money");
  const churnChart = getChart("churn_risk");

  // Helper to render chart with fallback
  const renderChart = (chart: any, fallbackMessage: string = "No data") => {
    if (!chart) {
      return <div className="text-center py-4 text-muted">{fallbackMessage}</div>;
    }

    if (!chart.data || chart.data.length === 0) {
      return <div className="text-center py-4 text-muted">No data available for this period</div>;
    }

    return <ChartRenderer chart={chart} />;
  };

  return (
    <div className="container-fluid">
      <div className="row g-4">

        {/* Row 1 - Primary Mentions & Issue Type */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={primaryMentionsChart?.title || "Primary Mentions"}
            tooltip={primaryMentionsChart?.tooltip || "Most discussed topics in customer reviews"}
            icon={primaryMentionsChart?.icon || "bi bi-tag-fill me-2"}
            loading={loading}
          >
            {renderChart(primaryMentionsChart, "No primary mentions data")}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard
            title={issueTypeChart?.title || "Issue Type Frequency"}
            tooltip={issueTypeChart?.tooltip || "Frequency of reported issue types"}
            icon={issueTypeChart?.icon || "bi bi-exclamation-triangle-fill me-2"}
            loading={loading}
          >
            {renderChart(issueTypeChart, "No issue type data")}
          </ChartCard>
        </div>

        {/* Row 2 - Journey Sentiment & Resolution Status */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={journeyChart?.title || "Journey Stage vs Sentiment"}
            tooltip={journeyChart?.tooltip || "Sentiment distribution across customer journey stages"}
            icon={journeyChart?.icon || "bi bi-signpost-split me-2"}
            loading={loading}
          >
            {renderChart(journeyChart, "No journey sentiment data")}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard
            title={resolutionChart?.title || "Resolution Status"}
            tooltip={resolutionChart?.tooltip || "Status of issue resolution"}
            icon={resolutionChart?.icon || "bi bi-check-circle-fill me-2"}
            loading={loading}
          >
            {renderChart(resolutionChart, "No resolution data")}
          </ChartCard>
        </div>

        {/* Row 3 - Value for Money & Churn Risk */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={valueChart?.title || "Value for Money"}
            tooltip={valueChart?.tooltip || "Customer perception of value"}
            icon={valueChart?.icon || "bi bi-wallet-fill me-2"}
            loading={loading}
          >
            {renderChart(valueChart, "No value for money data")}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard
            title={churnChart?.title || "Churn Risk"}
            tooltip={churnChart?.tooltip || "Likelihood of customer churn"}
            icon={churnChart?.icon || "bi bi-exclamation-octagon-fill me-2"}
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