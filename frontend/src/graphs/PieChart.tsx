import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

/* ================= TYPES ================= */

interface PieConfig {
  xKey?: string;   // ✅ dynamic key (IMPORTANT)
  outerRadius?: number;
  innerRadius?: number;
  colors?: string[];
  colorsMap?: Record<string, string>;
  showLegend?: boolean;
  showPercentage?: boolean;
}

interface Props {
  data: any[];      // ✅ make flexible
  config: PieConfig;
}

/* ================= CONSTANTS ================= */

const DEFAULT_COLORS = [
  "#3B82F6",
  "#EC4899",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#14B8A6"
];

const formatLabel = (value: any) => {
  if (!value) return "";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ================= COMPONENT ================= */

const GenericPieChart: React.FC<Props> = ({ data, config }) => {
  const {
    xKey = "name",   // ✅ dynamic key
    outerRadius = 100,
    innerRadius = 0,
    colors,
    colorsMap,
    showLegend = true,
    showPercentage = true
  } = config;

  const palette = colors || DEFAULT_COLORS;

  /* 🔥 SAFE COLOR FUNCTION */
  const getColor = (entry: any, index: number) => {
    const key = String(entry?.[xKey] || "")
      .toLowerCase()
      .trim();

    if (colorsMap && colorsMap[key]) {
      return colorsMap[key];
    }

    return palette[index % palette.length];
  };

  return (
    <>
      {/* ================= CHART ================= */}
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey={xKey}   // ✅ dynamic
            outerRadius={outerRadius}
            innerRadius={innerRadius}
          >
            {Array.isArray(data) &&
              data.map((entry, index) => (
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
          {Array.isArray(data) &&
            data.map((entry, index) => (
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
                  {formatLabel(entry?.[xKey])} - {entry?.value}
                  {showPercentage &&
                    entry?.percentage !== undefined &&
                    ` (${entry.percentage}%)`}
                </span>
              </div>
            ))}
        </div>
      )}
    </>
  );
};

export default GenericPieChart;