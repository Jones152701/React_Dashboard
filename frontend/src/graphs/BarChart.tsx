import React, { useMemo } from "react";
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

export interface DrillEvent {
  type: "bar" | "area" | "pie" | "word" | "treemap";
  key: string;
  value: any;
  data: any;
}

interface BarConfig {
  xKey: string;
  yKey: string;
  color?: string;
  colors?: string[];
  colorsMap?: Record<string, string>;
  radius?: [number, number, number, number];
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
  config: BarConfig;
  onDrillDown?: (event: DrillEvent) => void;
  drillKey?: string;
  selectedValue?: any;
}

/* ================= FORMATTERS ================= */

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
    return !isNaN(date.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}/) !== null;
  }

  return false;
};

const formatLabel = (value: any): string => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatXAxis = (value: any, isDate: boolean = false): string => {
  if (!value) return "";

  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const numValue = parseInt(value, 10);
    if (numValue >= 1 && numValue <= 5) {
      return `${numValue} star${numValue !== 1 ? 's' : ''}`;
    }
  }

  const shouldFormatAsDate = isDate || isDateValue(value);

  if (shouldFormatAsDate) {
    return formatDate(value, false);
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ================= COLOR HELPER ================= */

const getBarColor = (
  entry: any,
  index: number,
  xKey: string,
  color?: string,
  colors?: string[],
  colorsMap?: Record<string, string>,
  selectedValue?: any
): string => {
  const key = String(entry?.[xKey] || "").toLowerCase().trim();
  const isSelected = selectedValue !== undefined && entry?.[xKey] === selectedValue;

  if (isSelected) {
    return "#111827";
  }

  if (colorsMap && colorsMap[key]) {
    return colorsMap[key];
  }

  if (colors && colors.length > 0) {
    return colors[index % colors.length];
  }

  if (color) {
    return color;
  }

  return "#7B61FF";
};

/* ================= EMPTY STATE ================= */

const EmptyState: React.FC<{ height: number }> = ({ height }) => (
  <div
    style={{
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      color: '#6b7280',
      fontSize: '14px'
    }}
  >
    No data available
  </div>
);

/* ================= MAIN COMPONENT ================= */

const GenericBarChart: React.FC<Props> = ({ 
  data, 
  config, 
  onDrillDown,
  drillKey,
  selectedValue 
}) => {
  const {
    xKey,
    yKey,
    color,
    colors,
    colorsMap,
    radius = [4, 4, 0, 0],
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

  if (!data || data.length === 0) {
    return <EmptyState height={configHeight} />;
  }

  if (!yKey) {
    console.warn('GenericBarChart: yKey is required');
    return null;
  }

  const isVertical = layout === "vertical";

  const computedHeight = useMemo(() => {
    if (configHeight) return configHeight;
    if (isVertical) {
      return Math.max(320, Math.min(600, data.length * 40));
    }
    return 320;
  }, [configHeight, isVertical, data.length]);

  const tooltipLabelFormatter = useMemo(() => {
    return (label: any) => {
      if (typeof label === "number" || /^\d+$/.test(String(label))) {
        const num = parseInt(label, 10);
        if (num >= 1 && num <= 5) {
          return `${num} Star${num !== 1 ? "s" : ""}`;
        }
      }

      const shouldFormatAsDate = isDate || isDateValue(label);

      if (shouldFormatAsDate) {
        return formatDate(label, true);
      }

      return formatXAxis(label, false);
    };
  }, [isDate]);

  const handleBarClick = (entry: any) => {
    if (!onDrillDown) return;
    
    onDrillDown({
      type: "bar",
      key: drillKey || xKey,
      value: entry[xKey],
      data: entry,
    });
  };

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <BarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={margin}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={isVertical}
            horizontal={!isVertical}
          />
        )}

        <XAxis
          type={isVertical ? "number" : "category"}
          dataKey={!isVertical ? xKey : undefined}
          tick={{ fontSize: 11 }}
          tickFormatter={(val) => formatXAxis(val, isDate)}
          axisLine={false}
          tickLine={false}
        >
          {xLabel && (
            <Label
              value={xLabel}
              position="insideBottom"
              offset={xLabelOffset}
              fill="#4d4747"
            />
          )}
        </XAxis>

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
              offset={yLabelOffset}
              fill="#4d4747"
            />
          )}
        </YAxis>

        <Tooltip labelFormatter={tooltipLabelFormatter} />

        <Bar dataKey={yKey} fill={color || "#7B61FF"} radius={radius}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(entry, index, xKey, color, colors, colorsMap, selectedValue)}
              style={{ cursor: onDrillDown ? "pointer" : "default" }}
              onClick={() => handleBarClick(entry)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default GenericBarChart;