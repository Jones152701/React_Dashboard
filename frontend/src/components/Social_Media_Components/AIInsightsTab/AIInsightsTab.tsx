import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Treemap,
  Label
} from "recharts";

import ChartCard from "../ChartCard/ChartCard";
import type { SocialMediaResponse } from "../../../types/socialMedia";

interface Props {
  data: SocialMediaResponse | null;
  loading: boolean;
}

const COLORS = ["#10b95d", "#f65656", "#767676", "#7B61FF", "#FBBF24"];
const RESOLUTION_COLORS: Record<string, string> = {
  "resolved": "#10b95d",
  "partially_resolved": "#767676",
  "pending": "#3b82f6",
  "unresolved": "#f65656",
  "not_applicable": "#9ca3af",
};

const CHURN_COLORS: Record<string, string> = {
  "high": "#f65656",
  "medium": "#eab308",
  "low": "#10b95d",
  "not applicable": "#9ca3af",
};

const VALUE_COLORS: Record<string, string> = {
  "very_poor": "#f65656",
  "poor": "#f97316",
  "fair": "#eab308",
  "good": "#10b95d",
  "excellent": "#16a34a",
  "not_applicable": "#9ca3af",
};

const PRIMARY_MENTION_COLOR_PALETTE = [
  '#7C6EE6', '#3B82F6','#6B7280', '#DC2626', 
  '#22C55E', '#D97706','#7C3AED','#DB2777',
  '#0D9488','#EA580C','#16A34A','#4F46E5','#BE185D',
  '#6D28D9','#0891B2'  
];

const formatLabel = (value: string) => {
  return value
    .replace(/_/g, " ")                     // remove underscores
    .replace(/\b\w/g, (char) => char.toUpperCase()); // capitalize words
};


const AiInsightsTab: React.FC<Props> = ({ data, loading }) => {
  // Extract data from props
  const primaryMentions = data?.primary_mentions || [];
  const issueType = data?.issue_type_distribution || [];
  const journeySentiment = data?.journey_sentiment || [];
  const resolutionStatus = data?.resolution_status || [];
  const valueForMoney = data?.value_for_money || [];
  const churnRisk = data?.churn_risk || [];

  const renderTreemap = () => {
    if (!primaryMentions.length) {
      return <div className="text-center py-4 text-muted">No data</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <Treemap
          data={primaryMentions}
          dataKey="value"
          stroke="#fff"
          content={({ x, y, width, height, name, index }) => {
            const fill =
              PRIMARY_MENTION_COLOR_PALETTE[
              index % PRIMARY_MENTION_COLOR_PALETTE.length
              ];

            return (
              <g>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={fill}
                  stroke="#fff"
                />

                {width > 80 && height > 50 && (
                  <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fill: "#000",
                      fontSize: 12,
                      fontWeight: 500,
                      pointerEvents: "none"
                    }}
                  >
                    {name}
                  </text>
                )}
              </g>
            );
          }}
        >
          {/* ✅ Tooltip */}

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;

                const color =
                  PRIMARY_MENTION_COLOR_PALETTE[
                  payload[0].payload.index %
                  PRIMARY_MENTION_COLOR_PALETTE.length
                  ];

                return (
                  <div
                    style={{
                      background: "#fff",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "12px"
                    }}
                  >
                    {/* Name */}
                    <div style={{ fontWeight: 600 }}>
                      {formatLabel(data.name)}
                    </div>

                    {/* Value with matching color */}
                    <div style={{ color, fontWeight: 500 }}>
                      Mentions: {data.value}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    );
  };

  const renderIssueType = () => (
    <ResponsiveContainer width="95%" height={300}>
      <BarChart
        layout="vertical"
        data={issueType}
        margin={{ top: 10, right: 0, left: 30, bottom: 10 }}
      >
        <CartesianGrid horizontal={false} />

        <XAxis type="number" tick={{ fontSize: 11 }}>
          <Label
            value="Number of Issues"
            position="insideBottom"
            offset={-10}
            fill="#4d4747"
          />
        </XAxis>

        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 11 }}
          tickFormatter={formatLabel}
        >
          <Label
            value="Issue Type"
            angle={-90}
            position="insideLeft"
            offset={-20}
            fill="#4d4747"
          />
        </YAxis>

        <Tooltip labelFormatter={(label) => formatLabel(label)} />
        <Bar dataKey="value" fill="#7B61FF" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderJourneyStacked = () => (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={journeySentiment}
        margin={{ top: 30, right: 10, left: 30, bottom: 36 }}
      >
        <CartesianGrid vertical={false} />

        <XAxis
          dataKey="stage"
          interval={1}
          tick={{ fontSize: 11 }}
          tickFormatter={formatLabel}
        >
          <Label
            value="Journey Stage"
            position="insideBottom"
            offset={-20}
            fill="#4d4747"
          />
        </XAxis>

        <YAxis tick={{ fontSize: 11 }}>
          <Label
            value="Sentiment Count"
            angle={-90}
            position="insideLeft"
            dx={-5}
            dy={10}
            style={{ textAnchor: "middle" }}
            offset={-1}
            fill="#4d4747"
          />
        </YAxis>

        <Tooltip labelFormatter={(label) => formatLabel(label)} />

        <Bar dataKey="positive" stackId="a" fill="#10b95d" />
        <Bar dataKey="neutral" stackId="a" fill="#767676" />
        <Bar dataKey="negative" stackId="a" fill="#f65656" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderResolution = () => (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={resolutionStatus}
        margin={{ top: 30, right: 10, left: 15, bottom: 36 }}
      >
        <CartesianGrid vertical={false} />

        <XAxis
          dataKey="name"
          interval={0}
          tick={{ fontSize: 11 }}
          tickFormatter={formatLabel}
        >
          <Label
            value="Resolution Type"
            position="insideBottom"
            offset={-20}
            fill="#4d4747"
          />
        </XAxis>

        <YAxis tick={{ fontSize: 11 }}>
          <Label
            value="Count"
            angle={-90}
            position="insideLeft"
            offset={-3}
            fill="#4d4747"
          />
        </YAxis>

        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const key = data.name.toLowerCase().trim();

              const color =
                RESOLUTION_COLORS[key] ||
                VALUE_COLORS[key] ||
                "#7B61FF";

              return (
                <div
                  style={{
                    background: "#fff",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "15px"
                  }}
                >
                  {/* Line 1: Name */}
                  <div style={{ fontWeight: 600 }}>
                    {formatLabel(data.name)}
                  </div>

                  {/* Line 2: value */}
                  <div style={{ color, fontWeight: 500 }}>
                    value: {data.value}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {resolutionStatus.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                RESOLUTION_COLORS[entry.name.toLowerCase()] || "#7B61FF"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderValueForMoney = () => (
    <ResponsiveContainer width="95%" height={350}>
      <BarChart
        data={valueForMoney}
        margin={{ top: 30, right: 10, left: 15, bottom: 36 }}
      >
        <CartesianGrid vertical={false} />

        <XAxis
          dataKey="name"
          interval={0}
          tick={{ fontSize: 11 }}
          tickFormatter={formatLabel}
        >
          <Label
            value="Rating Category"
            position="insideBottom"
            offset={-20}
            fill="#4d4747"
          />
        </XAxis>

        <YAxis tick={{ fontSize: 11 }}>
          <Label
            value="Count"
            angle={-90}
            position="insideLeft"
            offset={-3}
            fill="#4d4747"
          />
        </YAxis>

        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const key = data.name.toLowerCase().trim();

              const color =
                RESOLUTION_COLORS[key] ||
                VALUE_COLORS[key] ||
                "#7B61FF";

              return (
                <div
                  style={{
                    background: "#fff",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "15px"
                  }}
                >
                  {/* Line 1: Name */}
                  <div style={{ fontWeight: 600 }}>
                    {formatLabel(data.name)}
                  </div>

                  {/* Line 2: value */}
                  <div style={{ color, fontWeight: 500 }}>
                    value: {data.value}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {valueForMoney.map((entry, index) => {
            const key = entry.name.toLowerCase().trim();

            return (
              <Cell
                key={`cell-${index}`}
                fill={VALUE_COLORS[key] || "#10b95d"}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderChurnRisk = () => (
    <>
      <ResponsiveContainer width="100%" height={325}>
        <PieChart>
          <Pie data={churnRisk} dataKey="value" outerRadius={100}>
            {churnRisk.map((_, i) => (
              <Cell
                key={i}
                fill={
                  CHURN_COLORS[_.name.toLowerCase().trim()] || "#7B61FF"
                }
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, name: any) => [
              value,
              formatLabel(name)
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="d-flex justify-content-center gap-3 mt-2 flex-wrap">
        {churnRisk.map((entry, i) => (
          <div key={i} className="d-flex align-items-center gap-2">
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: COLORS[i % COLORS.length],
              }}
            />
            <span style={{ fontSize: 12 }}>
              {formatLabel(entry.name)} - {entry.value}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="container-fluid">
      <div className="row g-4">
        {/* Row 1 */}
        <div className="col-12 col-lg-6">
          <ChartCard title="Primary Mentions"
           tooltip=" Most discussed topics in customer reviews"
            icon="bi bi-tag-fill me-2"
            loading={loading} >
            {renderTreemap()}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard title="Issue Type Frequency" tooltip="Frequency of reported issue types"
            icon="bi bi-exclamation-triangle-fill  me-2"
            loading={loading} >
            {renderIssueType()}
          </ChartCard>
        </div>

        {/* Row 2 */}
        <div className="col-12 col-lg-6">
          <ChartCard title="Journey Stage vs Sentiment" tooltip=" Sentiment across customer journey stages"
            icon="bi bi-signpost-split me-2"
            loading={loading} >
            {renderJourneyStacked()}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard title="Resolution Status" tooltip=" Status of issue resolution"
            icon="bi bi-check-circle-fill me-2"
            loading={loading} >
            {renderResolution()}
          </ChartCard>
        </div>

        {/* Row 3 */}
        <div className="col-12 col-lg-6">
          <ChartCard title="Value for Money" tooltip="  Customer perception of value"
            icon="bi bi-wallet-fill me-2"
            loading={loading} >
            {renderValueForMoney()}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard title="Churn Risk" tooltip="Likelihood of customer churn"
            icon="bi bi-exclamation-octagon-fill me-2"
            loading={loading} >
            {renderChurnRisk()}
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default AiInsightsTab;