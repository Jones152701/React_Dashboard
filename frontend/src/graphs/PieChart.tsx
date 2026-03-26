import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

/* ================= TYPES ================= */

interface PieConfig {
  nameKey?: string;
  dataKey?: string;
  outerRadius?: number;
  innerRadius?: number;
  colors?: string[];
  colorsMap?: Record<string, string>;
  showLegend?: boolean;
  showPercentage?: boolean;
  height?: number;
}

interface Props {
  data: any[];
  config: PieConfig;
}

/* ================= CONSTANTS ================= */

const DEFAULT_COLORS = [
  "#3B82F6",
  "#EC4899",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#14B8A6",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#84CC16"
];

const formatLabel = (value: any): string => {
  if (!value) return "";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ================= EMPTY STATE ================= */

const EmptyState: React.FC<{ height: number }> = ({ height }) => (
  <div
    style={{
      height,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f9fafb",
      borderRadius: "8px",
      color: "#6b7280",
      fontSize: "14px"
    }}
  >
    No data available
  </div>
);

/* ================= COMPONENT ================= */

const GenericPieChart: React.FC<Props> = ({ data, config }) => {
  const {
    nameKey = "name",
    dataKey = "value",
    outerRadius = 100,
    innerRadius = 0,
    colors,
    colorsMap,
    showLegend = true,
    showPercentage = true,
    height: configHeight = 280
  } = config;

  // Validation
  if (!data || data.length === 0) {
    return <EmptyState height={configHeight} />;
  }

  const palette = colors || DEFAULT_COLORS;

  /* ✅ Dynamic Height Calculation */
  const computedHeight = useMemo(() => {
    if (configHeight) return configHeight;
    return 280;
  }, [configHeight]);

  /* ✅ Safe Color Function */
  const getColor = (entry: any, index: number): string => {
    const key = String(entry?.[nameKey] || "")
      .toLowerCase()
      .trim();

    if (colorsMap && colorsMap[key]) {
      return colorsMap[key];
    }

    return palette[index % palette.length];
  };

  /* ✅ Calculate percentages for tooltip */
  const dataWithPercentages = useMemo(() => {
    const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);
    
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item[dataKey] / total) * 100) : 0
    }));
  }, [data, dataKey]);

  return (
    <>
      {/* ================= CHART ================= */}
      <ResponsiveContainer width="100%" height={computedHeight - (showLegend ? 60 : 0)}>
        <PieChart>
          <Pie
            data={dataWithPercentages}
            dataKey={dataKey}
            nameKey={nameKey}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            label={showPercentage ? undefined : undefined}
          >
            {dataWithPercentages.map((entry, index) => (
              <Cell key={index} fill={getColor(entry, index)} />
            ))}
          </Pie>

          <Tooltip
            formatter={(value: any, name: any, props: any) => {
              const percentage = props?.payload?.percentage;
              return [
                percentage !== undefined
                  ? `${value} (${percentage}%)`
                  : value,
                formatLabel(name)
              ];
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* ================= LEGEND ================= */}
      {showLegend && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            marginTop: "10px",
            flexWrap: "wrap"
          }}
        >
          {dataWithPercentages.map((entry, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: 500
              }}
            >
              {/* Dot */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: getColor(entry, index)
                }}
              />

              {/* Text */}
              <span>
                {formatLabel(entry[nameKey])} - {entry[dataKey]}
                {showPercentage && entry.percentage !== undefined && ` (${entry.percentage}%)`}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default GenericPieChart;