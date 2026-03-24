import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Label
} from "recharts";

/* ================= TYPES ================= */

interface AreaConfig {
  xKey: string;
  areas: {
    key: string;
    color?: string;
  }[];
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
  config: AreaConfig;
}

/* ================= FORMATTER ================= */

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

const GenericAreaChart: React.FC<Props> = ({ data, config }) => {
  const {
    xKey,
    areas = [],
    xLabel,
    yLabel,

    // ✅ NEW values from backend
    margin = { top: 20, right: 10, left: 20, bottom: 30 },
    xLabelOffset = -10,
    yLabelOffset = -10
  } = config;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={margin}>
        {/* Grid */}
        <CartesianGrid vertical={false} strokeDasharray="3 3" />

        {/* X Axis */}
        <XAxis
          dataKey={xKey}
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
          tick={{ fontSize: 11 }}
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
        <Tooltip
          labelFormatter={(label) => {
            const date = new Date(label);

            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric"
              });
            }

            return formatXAxis(label);
          }}
        />

        {/* Areas */}
        {areas.map((area, i) => (
          <Area
            key={i}
            type="monotone"
            dataKey={area.key}
            stroke={area.color || "#7B61FF"}
            fill={area.color || "#7B61FF"}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default GenericAreaChart;