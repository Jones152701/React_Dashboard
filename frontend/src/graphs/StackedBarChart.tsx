import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Label
} from "recharts";

/* ================= TYPES ================= */

interface StackedBarConfig {
  xKey: string;

  bars: {
    key: string;
    name?: string;
    color?: string;
    stackId: string;
    radius?: [number, number, number, number];
  }[];

  layout?: "horizontal" | "vertical";
  showGrid?: boolean;

  xLabel?: string;
  yLabel?: string;

  margin?: {
    top?: number;
    right?: number;
    left?: number;
    bottom?: number;
  };

  xLabelOffset?: number;
  yLabelOffset?: number;

  height?: number;
  isDate?: boolean;
}

interface Props {
  data: any[];
  config: StackedBarConfig;
}

/* ================= DATE FORMATTER ================= */

const formatDate = (value: any, withYear: boolean = false): string => {
  if (!value) return "";

  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(withYear && { year: "numeric" })
  });
};

const isDateValue = (value: any): boolean => {
  if (!value) return false;

  if (typeof value === 'number') {
    const year = new Date(value).getFullYear();
    return year >= 2000 && year <= 2100;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return !isNaN(date.getTime()) &&
      value.match(/^\d{4}-\d{2}-\d{2}/) !== null;
  }

  return false;
};

/* ================= FORMATTERS ================= */

const formatXAxis = (value: any, isDate: boolean = false): string => {
  if (!value) return "";

  const shouldFormatAsDate = isDate || isDateValue(value);

  if (shouldFormatAsDate) {
    return formatDate(value, false);
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatLabel = (value: any): string => {
  if (value === null || value === undefined) return "";
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

const StackedBarChart: React.FC<Props> = ({ data, config }) => {
  const {
    xKey,
    bars = [],
    layout = "horizontal",
    showGrid = true,
    xLabel,
    yLabel,
    margin = { top: 20, right: 10, left: 20, bottom: 30 },
    xLabelOffset = -10,
    yLabelOffset = -10,
    height: configHeight = 320,
    isDate = false
  } = config;

  // Validation
  if (!data || data.length === 0) {
    return <EmptyState height={configHeight} />;
  }

  if (!bars || bars.length === 0) {
    console.warn("StackedBarChart: bars config required");
    return null;
  }

  const isVertical = layout === "vertical";

  /* ✅ Dynamic Height Calculation */
  const computedHeight = useMemo(() => {
    // 1. Backend override (highest priority)
    if (configHeight) return configHeight;

    // 2. Dynamic fallback based on layout and data
    if (isVertical) {
      return Math.max(320, Math.min(600, data.length * 40));
    }

    return 320;
  }, [configHeight, isVertical, data.length]);

  /* ✅ Tooltip Formatter */
  const tooltipLabelFormatter = useMemo(() => {
    return (label: any) => {
      const shouldFormatAsDate = isDate || isDateValue(label);

      if (shouldFormatAsDate) {
        return formatDate(label, true);
      }
      return formatXAxis(label, false);
    };
  }, [isDate]);

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <BarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={margin}
      >
        {/* Grid - FIXED for both orientations */}
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={isVertical}  // Vertical lines for horizontal layout
            horizontal={!isVertical}  // Horizontal lines for vertical layout
          />
        )}

        {/* X Axis */}
        <XAxis
          type={isVertical ? "number" : "category"}
          dataKey={!isVertical ? xKey : undefined}
          tick={{ fontSize: 11 }}
          tickFormatter={(val) => formatXAxis(val, isDate)}
          axisLine={false}
          tickLine={false}
        >
          {xLabel && (
            <Label value={xLabel} position="insideBottom" offset={xLabelOffset} fill="#4d4747"/>
          )}
        </XAxis>

        {/* Y Axis */}
        <YAxis
          type={isVertical ? "category" : "number"}
          dataKey={isVertical ? xKey : undefined}
          width={isVertical ? 120 : undefined}
          tick={{ fontSize: 11 }}
          tickFormatter={(val) => {
            if (isVertical) {
              const shouldFormatAsDate = isDate || isDateValue(val);
              if (shouldFormatAsDate) {
                return formatDate(val, false);
              }
            }
            return formatLabel(val);
          }}
          axisLine={false}
          tickLine={false}
        >
          {yLabel && (
            <Label
              value={yLabel}
              angle={-90}
              position="insideLeft"
              offset={yLabelOffset}
              fill="#4d4747"
            />
          )}
        </YAxis>

        {/* Tooltip */}
        <Tooltip labelFormatter={tooltipLabelFormatter} />

        {/* Multiple Bars (Stacked Only) */}
        {bars.map((bar, index) => (
          <Bar
            key={index}
            dataKey={bar.key}
            stackId={bar.stackId}
            fill={bar.color || "#7B61FF"}
            radius={bar.radius}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default StackedBarChart;