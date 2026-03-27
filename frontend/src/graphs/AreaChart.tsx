import React, { useMemo } from "react";
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

export interface DrillEvent {
  type: "bar" | "area" | "pie" | "word" | "treemap";
  key: string;
  value: any;
  data: any;
}

interface AreaConfig {
  xKey: string;
  yKey?: string;
  areas: {
    key: string;
    color?: string;
  }[];
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
  config: AreaConfig;
  onDrillDown?: (event: DrillEvent) => void;
  drillKey?: string;
  selectedValue?: any; // Keep it for future use (highlighting)
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
    return !isNaN(date.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}/) !== null;
  }

  return false;
};

/* ================= FORMATTER ================= */

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

/* ================= PAYLOAD EXTRACTOR ================= */

const extractPayloadFromEvent = (state: any) => {
  return state?.activePayload?.[0]?.payload || null;
};

/* ================= COMPONENT ================= */

const GenericAreaChart: React.FC<Props> = ({ 
  data, 
  config, 
  onDrillDown, 
  drillKey, 
  // selectedValue // Keep for future highlighting implementation
}) => {
  const {
    xKey,
    areas = [],
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

  if (!areas || areas.length === 0) {
    console.warn("GenericAreaChart: areas config required");
    return null;
  }

  /* ✅ Dynamic Height Calculation */
  const computedHeight = useMemo(() => {
    if (configHeight) return configHeight;
    return 320;
  }, [configHeight]);

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

  /* ✅ Handle Drill Click - Attached to AreaChart for better stability */
  const handleChartClick = (state: any) => {
    if (!onDrillDown) return;
    
    const payload = extractPayloadFromEvent(state);
    if (payload) {
      onDrillDown({
        type: "area",
        key: drillKey || xKey,
        value: payload[xKey],
        data: payload,
      });
    }
  };

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <AreaChart 
        data={data} 
        margin={margin}
        onClick={handleChartClick}
        style={{ cursor: onDrillDown ? "pointer" : "default" }}
      >
        {/* Grid */}
        <CartesianGrid strokeDasharray="3 3" vertical={false} />

        {/* X Axis */}
        <XAxis
          dataKey={xKey}
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
              offset={yLabelOffset}
              fill="#4d4747"
            />
          )}
        </YAxis>

        {/* Tooltip */}
        <Tooltip labelFormatter={tooltipLabelFormatter} />

        {/* Areas - No onClick handlers here, cleaner and more stable */}
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