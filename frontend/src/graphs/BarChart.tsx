import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Label
} from "recharts";

/* ================= TYPES ================= */

interface BarConfig {
  xKey: string;
  layout?: "horizontal" | "vertical";

  bars: {
    key: string;
    stackId?: string;
    color?: string;
    radius?: [number, number, number, number];
  }[];

  colorsMap?: Record<string, string>;
  showGrid?: boolean;

  xLabel?: string;
  yLabel?: string;

  // ✅ NEW (from backend)
  margin?: {
    top?: number;
    right?: number;
    left?: number;
    bottom?: number;
  };
  xLabelOffset?: number;
  yLabelOffset?: number;
}

interface Props {
  data: any[];
  config: BarConfig;
}

/* ================= FORMATTER ================= */

const formatLabel = (value: any) => {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatXAxis = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  // ✅ If valid date → "12 Oct"
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short"
    });
  }

  // ✅ Otherwise treat as text
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ================= COMPONENT ================= */

const GenericBarChart: React.FC<Props> = ({ data, config }) => {
  const {
    xKey,
    bars = [],
    layout = "horizontal",
    colorsMap,
    showGrid = true,
    xLabel,
    yLabel,

    // ✅ NEW dynamic config
    margin = { top: 20, right: 10, left: 20, bottom: 30 },
    xLabelOffset = -10,
    yLabelOffset = -10
  } = config;

  const isVertical = layout === "vertical";

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={margin}   // ✅ dynamic
      >
        {/* Grid */}
        {showGrid && <CartesianGrid vertical={false} />}

        {/* X Axis */}
        <XAxis
          type={isVertical ? "number" : "category"}
          dataKey={!isVertical ? xKey : undefined}
          tick={{ fontSize: 11 }}
          tickFormatter={formatXAxis}
          axisLine={false}
          tickLine={false}
        >
          {xLabel && (
            <Label
              value={xLabel}
              position="insideBottom"
              offset={xLabelOffset}   // ✅ dynamic
            />
          )}
        </XAxis>

        {/* Y Axis */}
        <YAxis
          type={isVertical ? "category" : "number"}
          dataKey={isVertical ? xKey : undefined}
          width={isVertical ? 120 : undefined}
          tick={{ fontSize: 11 }}
          tickFormatter={formatLabel}
          axisLine={false}
          tickLine={false}
        >
          {yLabel && (
            <Label
              value={yLabel}
              angle={-90}
              position="insideLeft"
              offset={yLabelOffset}   // ✅ dynamic
            />
          )}
        </YAxis>

        {/* Tooltip */}
        <Tooltip labelFormatter={(label) => {
            const date = new Date(label);

            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric"
              });
            }

            return formatXAxis(label);
          }} />

        {/* Bars */}
        {bars.map((bar, index) => (
          <Bar
            key={index}
            dataKey={bar.key}
            stackId={bar.stackId}
            fill={bar.color || "#7B61FF"}
            radius={bar.radius || [4, 4, 0, 0]}
          >
            {/* ✅ Dynamic color mapping */}
            {colorsMap &&
              data.map((entry, i) => {
                const key = String(entry?.[xKey] || "")
                  .toLowerCase()
                  .trim();

                return (
                  <Cell
                    key={`cell-${i}`}
                    fill={colorsMap[key] || bar.color || "#7B61FF"}
                  />
                );
              })}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default GenericBarChart;