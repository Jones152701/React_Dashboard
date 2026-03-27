import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Label,
  Cell
} from "recharts";

/* ================= TYPES ================= */

export interface DrillEvent {
  type: "bar" | "area" | "pie" | "word" | "treemap";
  key: string;
  value: any;
  data: any;
}

interface StackedBarConfig {
  xKey: string;
  drillKey?: string;
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
  onDrillDown?: (event: DrillEvent) => void;
  drillKey?: string;
  selectedValue?: any;
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

const formatLabel = (value: any): string => {
  if (!value) return "";
  if (typeof value !== 'string') return String(value);

  return String(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatXAxis = (value: any, isDate: boolean = false): string => {
  if (!value) return "";

  const shouldFormatAsDate = isDate || isDateValue(value);

  if (shouldFormatAsDate) {
    return formatDate(value, false);
  }

  return formatLabel(value);
};

/* ================= CUSTOM TOOLTIP ================= */

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const borderColor = payload[0]?.color || "#e5e7eb";

  return (
    <div
      style={{
        background: "#fff",
        padding: "10px 14px",
        borderRadius: "8px",
        border: `1px solid ${borderColor}`,
        fontSize: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        minWidth: "140px",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: "8px",
          paddingBottom: "4px",
          borderBottom: "1px solid #e5e7eb",
          color: "#111827",
        }}
      >
        {formatLabel(label)}
      </div>

      {payload.map((item: any, i: number) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: i === payload.length - 1 ? 0 : "6px",
          }}
        >
          <span style={{ color: item.color }}>
            {formatLabel(item.name || item.dataKey)}
          </span>
          <strong style={{ color: "#111827" }}>{item.value}</strong>
        </div>
      ))}
    </div>
  );
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

/* ================= MAIN COMPONENT ================= */

const StackedBarChart: React.FC<Props> = ({ 
  data, 
  config, 
  onDrillDown, 
  drillKey, 
  selectedValue 
}) => {
  const {
    xKey,
    drillKey: configDrillKey,
    bars = [],
    layout = "horizontal",
    showGrid = true,
    xLabel,
    yLabel,
    margin = { top: 20, right: 10, left: 20, bottom: 30 },
    xLabelOffset = -10,
    yLabelOffset = -10,
    height: configHeight = 320,
    isDate = false,
  } = config;

  const finalDrillKey = drillKey || configDrillKey || xKey;

  console.log("STACKED BAR CONFIG:", {
    xKey,
    configDrillKey,
    finalDrillKey,
    barsCount: bars.length
  });

  if (!data || data.length === 0) {
    return <EmptyState height={configHeight} />;
  }

  if (!bars || bars.length === 0) {
    console.warn("StackedBarChart: bars config required");
    return null;
  }

  const isVertical = layout === "vertical";

  const computedHeight = useMemo(() => {
    let height = configHeight;
    if (!height) {
      if (isVertical) {
        height = Math.max(320, Math.min(600, data.length * 40));
      } else {
        height = 320;
      }
    }
    return Math.round(height);
  }, [configHeight, isVertical, data.length]);

  const tooltipLabelFormatter = useMemo(() => {
    return (label: any) => {
      const shouldFormatAsDate = isDate || isDateValue(label);

      if (shouldFormatAsDate) {
        return formatDate(label, true);
      }
      return formatLabel(label);
    };
  }, [isDate]);

  /* ✅ FIXED: Segment-level click with dynamic key */
  const handleSegmentClick = (entry: any, segmentKey: string) => {
    if (!onDrillDown || !entry) return;

    console.log("STACKED SEGMENT CLICK:", {
      segmentKey,
      xValue: entry[xKey],
      xKey,
      entryData: entry
    });

    onDrillDown({
      type: "bar",
      key: "segment",
      value: segmentKey,
      data: {
        [xKey]: entry[xKey],   // ✅ Dynamic key (e.g., "stage", "date", "category")
        segment: segmentKey,
        ...entry,
      },
    });
  };

  /* ✅ FIXED: Bar area click with dynamic key */
  const handleBarClick = (entry: any) => {
    if (!onDrillDown || !entry) return;
    
    console.log("BAR AREA CLICK:", {
      xValue: entry[xKey],
      xKey
    });

    onDrillDown({
      type: "bar",
      key: xKey,               // ✅ Dynamic key (e.g., "stage", "date", etc.)
      value: entry[xKey],      // The x-axis value
      data: entry,
    });
  };

  const handleChartClick = (state: any) => {
    if (!onDrillDown) return;
    
    const payload = extractPayloadFromEvent(state);
    if (payload) {
      handleBarClick(payload);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <BarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={margin}
        onClick={handleChartClick}
        style={{ 
          cursor: onDrillDown ? "pointer" : "default",
          shapeRendering: "crispEdges",
        }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={isVertical}
            horizontal={!isVertical}
            stroke="#e5e7eb"
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
              value={formatLabel(xLabel)} 
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
              value={formatLabel(yLabel)}
              angle={-90}
              position="insideLeft"
              offset={yLabelOffset}
              fill="#4d4747"
            />
          )}
        </YAxis>

        <Tooltip
          content={<CustomTooltip />}
          labelFormatter={tooltipLabelFormatter}
          cursor={{ fill: "rgba(0, 0, 0, 0.04)" }}
        />

        {bars.map((bar, barIndex) => (
          <Bar
            key={barIndex}
            dataKey={bar.key}
            stackId={bar.stackId}
            radius={bar.radius}
            fill={bar.color || "#7B61FF"}
          >
            {data.map((entry, dataIndex) => {
              const isSelected = selectedValue !== undefined && entry[xKey] === selectedValue;
              const segmentValue = entry[bar.key];
              
              if (segmentValue === undefined || segmentValue === null) return null;
              
              return (
                <Cell
                  key={`cell-${barIndex}-${dataIndex}`}
                  fill={bar.color || "#7B61FF"}
                  fillOpacity={isSelected ? 0.7 : 1}
                  style={{ cursor: onDrillDown ? "pointer" : "default" }}
                  onClick={() => handleSegmentClick(entry, bar.key)}
                />
              );
            })}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default StackedBarChart;