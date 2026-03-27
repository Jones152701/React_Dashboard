import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

/* ================= TYPES ================= */

export interface DrillEvent {
  type: "bar" | "area" | "pie" | "word" | "treemap";
  key: string;
  value: any;
  data: any;
}

interface PieConfig {
  nameKey?: string;
  dataKey?: string;
  drillKey?: string;  // ✅ ADDED
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
  onDrillDown?: (event: DrillEvent) => void;
  selectedValue?: any;
  drillKey?: string;  // ✅ ADDED
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

const GenericPieChart: React.FC<Props> = ({ 
  data, 
  config, 
  onDrillDown, 
  selectedValue,
  drillKey
}) => {
  // ✅ DEBUG: Log the config to verify drillKey is being passed
  console.log("PIE CONFIG:", config);

  const {
    nameKey = "name",
    dataKey = "value",
    drillKey: configDrillKey,  // ✅ ADDED
    outerRadius = 100,
    innerRadius = 0,
    colors,
    colorsMap,
    showLegend = true,
    showPercentage = true,
    height: configHeight = 280
  } = config;

  // ✅ Determine which drill key to use (prop > config > nameKey)
  const finalDrillKey = drillKey || configDrillKey || nameKey;
  
  // ✅ DEBUG: Log the final drill key being used
  console.log("Final drill key:", finalDrillKey);

  if (!data || data.length === 0) {
    return <EmptyState height={configHeight} />;
  }

  const palette = colors || DEFAULT_COLORS;

  const computedHeight = useMemo(() => {
    if (configHeight) return configHeight;
    return 280;
  }, [configHeight]);

  const getColor = (entry: any, index: number): string => {
    const key = String(entry?.[nameKey] || "")
      .toLowerCase()
      .trim();
    
    const isSelected = selectedValue !== undefined && entry?.[nameKey] === selectedValue;
    
    if (isSelected) {
      return "#111827";
    }

    if (colorsMap && colorsMap[key]) {
      return colorsMap[key];
    }

    return palette[index % palette.length];
  };

  const dataWithPercentages = useMemo(() => {
    const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);
    
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item[dataKey] / total) * 100) : 0
    }));
  }, [data, dataKey]);

  // ✅ FIXED click handler
  const handlePieClick = (entry: any) => {
    if (!onDrillDown) return;
    
    // ✅ DEBUG: Log what's being sent in drill event
    console.log("Pie click drill event:", {
      type: "pie",
      key: finalDrillKey,
      value: entry[nameKey],
      data: entry
    });
    
    onDrillDown({
      type: "pie",
      key: finalDrillKey,  // ✅ CRITICAL FIX - uses drillKey instead of nameKey
      value: entry[nameKey],  // value still uses the display name
      data: entry,
    });
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={computedHeight - (showLegend ? 60 : 0)}>
        <PieChart>
          <Pie
            data={dataWithPercentages}
            dataKey={dataKey}
            nameKey={nameKey}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
          >
            {dataWithPercentages.map((entry, index) => (
              <Cell 
                key={index} 
                fill={getColor(entry, index)}
                style={{ cursor: onDrillDown ? "pointer" : "default" }}
                onClick={() => handlePieClick(entry)}
              />
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
          {dataWithPercentages.map((entry, index) => {
            const isSelected = selectedValue !== undefined && entry[nameKey] === selectedValue;
            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: onDrillDown ? "pointer" : "default",
                  opacity: isSelected ? 1 : 0.8,
                }}
                onClick={() => handlePieClick(entry)}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: getColor(entry, index)
                  }}
                />
                <span>
                  {formatLabel(entry[nameKey])} - {entry[dataKey]}
                  {showPercentage && entry.percentage !== undefined && ` (${entry.percentage}%)`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default GenericPieChart;