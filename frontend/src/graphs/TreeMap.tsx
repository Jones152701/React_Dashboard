import React, { useMemo } from "react";
import {
  Treemap,
  ResponsiveContainer,
  Tooltip
} from "recharts";

/* ================= TYPES ================= */

// ✅ Updated with index signature to match Recharts expectations
export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
  [key: string]: any; // ✅ Allows additional properties like index, percentage, etc.
}

interface TreemapConfig {
  dataKey: string;
  nameKey?: string;
  aspectRatio?: number;
  stroke?: string;
  strokeWidth?: number;
  colors?: string[];           // Array of colors (alternating)
  colorsMap?: Record<string, string>;  // Semantic mapping
  showTooltip?: boolean;
  showValues?: boolean;
  height?: number;
  borderRadius?: number;
}

interface Props {
  data: TreemapNode[];
  config: TreemapConfig;
}

/* ================= UTILITIES ================= */

/**
 * Calculate text color based on background brightness
 * Returns black (#000) for light backgrounds, white (#fff) for dark backgrounds
 */
const getTextColor = (bgColor: string): string => {
  if (!bgColor) return "#000";

  // Remove the # if present
  const color = bgColor.replace("#", "");
  
  // Parse RGB values
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Calculate brightness using perceived luminance formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return black for bright backgrounds, white for dark backgrounds
  return brightness > 100 ? "#000" : "#000";
};

/**
 * Truncate text to prevent overflow
 */
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
  colorsMap?: Record<string, string>
): string => {
  const key = String(entry?.[nameKey] || "").toLowerCase().trim();

  // 1. Highest priority: semantic mapping (colorsMap)
  if (colorsMap && colorsMap[key]) {
    return colorsMap[key];
  }

  // 2. Second priority: array of colors (alternating)
  if (colors && colors.length > 0) {
    return colors[index % colors.length];
  }

  // 3. Default color
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
}

type ExtendedContentProps = ContentProps & {
  colors?: string[];
  colorsMap?: Record<string, string>;
  nameKey?: string;
  showValues?: boolean;
  borderRadius?: number;
};

const CustomizedContent: React.FC<ExtendedContentProps> = ({
  x,
  y,
  width,
  height,
  index,
  name,
  value,
  payload,
  colors = [],
  colorsMap,
  nameKey = "name",
  showValues = false,
  borderRadius = 4
}) => {
  // Get color using the enhanced helper
  const color = getTreemapColor(
    payload || { [nameKey]: name, value },
    index,
    nameKey,
    colors,
    colorsMap
  );
  
  // ✅ Dynamic text color based on background brightness
  const textColor = getTextColor(color);
  
  // ✅ Truncate long names
  const displayName = truncateText(formatLabel(name), 20);
  const displayValue = truncateText(String(value), 10);

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
      />

      {/* Name - with dynamic color */}
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

      {/* Value - with dynamic color */}
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

const GenericTreemap: React.FC<Props> = ({ data, config }) => {
  const {
    dataKey,
    nameKey = "name",
    aspectRatio = 4 / 3,
    stroke = "#fff",
    colors = [],
    colorsMap,
    showTooltip = true,
    showValues = false,
    height: configHeight = 320,
    borderRadius = 4
  } = config;

  // Validation
  if (!data || data.length === 0) {
    return <EmptyState height={configHeight} />;
  }

  /* ✅ Dynamic Height Calculation */
  const computedHeight = useMemo(() => {
    if (configHeight) return configHeight;
    return 320;
  }, [configHeight]);

  /* ✅ Format data for treemap with indices and percentages */
  const treemapData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    return data.map((item, index) => ({
      ...item,
      index, // Store index for color mapping
      [nameKey]: item[nameKey as keyof typeof item] || item.name,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
    }));
  }, [data, nameKey]);

  /* ✅ Custom tooltip formatter with dynamic colors */
  const tooltipContent = useMemo(() => {
    return ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        const color = getTreemapColor(data, data.index, nameKey, colors, colorsMap);
        
        
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
  }, [nameKey, colors, colorsMap]);

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      {/* ✅ Using as any to bypass Recharts strict typing */}
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
          />
        )}
      >
        {showTooltip && <Tooltip content={tooltipContent} />}
      </Treemap>
    </ResponsiveContainer>
  );
};

export default GenericTreemap;