import React, { useMemo } from "react";
import {
  Treemap,
  ResponsiveContainer,
  Tooltip
} from "recharts";

/* ================= TYPES ================= */

export interface DrillEvent {
  type: "bar" | "area" | "pie" | "word" | "treemap";
  key: string;
  value: any;
  data: any;
}

export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
  [key: string]: any;
}

interface TreemapConfig {
  dataKey: string;
  nameKey?: string;
  drillKey?: string;  // ✅ ADDED
  aspectRatio?: number;
  stroke?: string;
  strokeWidth?: number;
  colors?: string[];
  colorsMap?: Record<string, string>;
  showTooltip?: boolean;
  showValues?: boolean;
  height?: number;
  borderRadius?: number;
}

interface Props {
  data: TreemapNode[];
  config: TreemapConfig;
  onDrillDown?: (event: DrillEvent) => void;
  selectedValue?: any;
  drillKey?: string;  // ✅ ADDED
}

/* ================= UTILITIES ================= */

const getTextColor = (bgColor: string): string => {
  if (!bgColor) return "#000";

  const color = bgColor.replace("#", "");
  
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness > 100 ? "#000" : "#fff";
};

const truncateText = (text: string, maxLength: number = 15): string => {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
};

const formatLabel = (value: string): string => {
  if (!value) return "";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ================= COLOR HELPER ================= */

const getTreemapColor = (
  entry: any,
  index: number,
  nameKey: string,
  colors?: string[],
  colorsMap?: Record<string, string>,
  selectedValue?: any
): string => {
  const key = String(entry?.[nameKey] || "").toLowerCase().trim();
  const isSelected = selectedValue !== undefined && entry?.[nameKey] === selectedValue;

  if (isSelected) {
    return "#111827";
  }

  if (colorsMap && colorsMap[key]) {
    return colorsMap[key];
  }

  if (colors && colors.length > 0) {
    return colors[index % colors.length];
  }

  return "#7B61FF";
};

/* ================= CUSTOM CONTENT ================= */

interface ContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  name: string;
  value: number;
  depth?: number;
  payload?: any;
  onDrillDown?: (event: DrillEvent) => void;
  nameKey?: string;
  showValues?: boolean;
  borderRadius?: number;
  colors?: string[];
  colorsMap?: Record<string, string>;
  selectedValue?: any;
  drillKey?: string;  // ✅ ADDED
}

const CustomizedContent: React.FC<ContentProps> = ({
  x,
  y,
  width,
  height,
  index,
  name,
  value,
  payload,
  onDrillDown,
  nameKey = "name",
  showValues = false,
  borderRadius = 4,
  colors = [],
  colorsMap,
  selectedValue,
  drillKey  // ✅ ADDED
}) => {
  const color = getTreemapColor(
    payload || { [nameKey]: name, value },
    index,
    nameKey,
    colors,
    colorsMap,
    selectedValue
  );
  
  const textColor = getTextColor(color);
  const displayName = truncateText(formatLabel(name), 20);
  const displayValue = truncateText(String(value), 10);

  // ✅ FIXED click handler
  const handleClick = () => {
    if (!onDrillDown) return;

    const finalKey = drillKey || nameKey;

    console.log("TREEMAP DRILL EVENT:", {
      finalKey,
      value: payload?.[nameKey] || name,
      type: "treemap"
    });

    onDrillDown({
      type: "treemap",
      key: finalKey,   // ✅ FIXED - uses drillKey instead of nameKey
      value: payload?.[nameKey] || name,
      data: payload || { [nameKey]: name, value },
    });
  };

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        rx={borderRadius}
        ry={borderRadius}
        style={{ cursor: onDrillDown ? "pointer" : "default" }}
        onClick={handleClick}
      />

      {width > 60 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showValues ? 6 : 0)}
          textAnchor="middle"
          fill={textColor}
          fontSize={Math.min(12, width / 8)}
          fontWeight={500}
          style={{ 
            pointerEvents: "none",
            textShadow: textColor === "#fff" ? "0 1px 2px rgba(0,0,0,0.3)" : "none"
          }}
        >
          {displayName}
        </text>
      )}

      {showValues && width > 60 && height > 40 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill={textColor}
          fontSize={Math.min(10, width / 10)}
          opacity={0.9}
          style={{ 
            pointerEvents: "none",
            textShadow: textColor === "#fff" ? "0 1px 2px rgba(0,0,0,0.3)" : "none"
          }}
        >
          {displayValue}
        </text>
      )}
    </g>
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

/* ================= COMPONENT ================= */

const GenericTreemap: React.FC<Props> = ({ 
  data, 
  config, 
  onDrillDown, 
  selectedValue,
  drillKey  // ✅ ADDED
}) => {
  // ✅ DEBUG: Log the config to verify drillKey is being passed
  console.log("TREEMAP CONFIG:", config);

  const {
    dataKey,
    nameKey = "name",
    drillKey: configDrillKey,  // ✅ ADDED
    aspectRatio = 4 / 3,
    stroke = "#fff",
    colors = [],
    colorsMap,
    showTooltip = true,
    showValues = false,
    height: configHeight = 320,
    borderRadius = 4
  } = config;

  // ✅ Determine which drill key to use (prop > config > nameKey)
  const finalDrillKey = drillKey || configDrillKey || nameKey;
  
  // ✅ DEBUG: Log the final drill key being used
  console.log("Final treemap drill key:", finalDrillKey);

  if (!data || data.length === 0) {
    return <EmptyState height={configHeight} />;
  }

  const computedHeight = useMemo(() => {
    if (configHeight) return configHeight;
    return 320;
  }, [configHeight]);

  const treemapData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    return data.map((item, index) => ({
      ...item,
      index,
      [nameKey]: item[nameKey as keyof typeof item] || item.name,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
    }));
  }, [data, nameKey]);

  const tooltipContent = useMemo(() => {
    return ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        const color = getTreemapColor(data, data.index, nameKey, colors, colorsMap, selectedValue);
        
        return (
          <div
            style={{
              background: "#fff",
              padding: "8px 12px",
              border: `1px solid ${color}`,
              borderRadius: "6px",
              fontSize: "12px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            <div style={{ 
              fontWeight: 600, 
              marginBottom: 4, 
              color: color,
              padding: "2px 6px",
              borderRadius: "4px",
              display: "inline-block"
            }}>
              {formatLabel(data[nameKey] || data.name)}
            </div>
            <div style={{ color: "#666", marginTop: 6 }}>
              Mentions: <strong>{data.value}</strong>
            </div>
          </div>
        );
      }
      return null;
    };
  }, [nameKey, colors, colorsMap, selectedValue]);

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <Treemap
        data={treemapData as any}
        dataKey={dataKey}
        nameKey={nameKey}
        aspectRatio={aspectRatio}
        stroke={stroke}
        content={(props: any) => (
          <CustomizedContent
            {...props}
            colors={colors}
            colorsMap={colorsMap}
            nameKey={nameKey}
            showValues={showValues}
            borderRadius={borderRadius}
            onDrillDown={onDrillDown}
            selectedValue={selectedValue}
            drillKey={finalDrillKey}  // ✅ ADDED - pass the drill key
          />
        )}
      >
        {showTooltip && <Tooltip content={tooltipContent} />}
      </Treemap>
    </ResponsiveContainer>
  );
};

export default GenericTreemap;