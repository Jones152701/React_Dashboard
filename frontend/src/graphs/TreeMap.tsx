import React from "react";
import {
  Treemap,
  ResponsiveContainer,
  Tooltip
} from "recharts";

/* ================= TYPES ================= */

export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
}

interface TreemapConfig {
  dataKey: string;
  nameKey?: string;
  aspectRatio?: number;
  stroke?: string;
  colors?: string[];
  showTooltip?: boolean;
  showValues?: boolean;
}

interface Props {
  data: TreemapNode[];
  config: TreemapConfig;
}

/* ================= CUSTOM CONTENT ================= */

interface ContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  name: string;
  value: number;
}

type ExtendedContentProps = ContentProps & {
  colors?: string[];
  showValues?: boolean;
};

const CustomizedContent: React.FC<ExtendedContentProps> = ({
  x,
  y,
  width,
  height,
  index,
  name,
  value,
  colors = [],
  showValues = false
}) => {
  const color =
    colors[index % colors.length] || "#7B61FF";

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
        rx={4}
      />

      {/* Name */}
      {width > 60 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showValues ? 6 : 0)}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight={500}
        >
          {name}
        </text>
      )}

      {/* Value */}
      {showValues && width > 60 && height > 40 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill="#fff"
          fontSize={10}
          opacity={0.9}
        >
          {value}
        </text>
      )}
    </g>
  );
};

/* ================= COMPONENT ================= */

const GenericTreemap: React.FC<Props> = ({
  data,
  config
}) => {
  const {
    dataKey,
    nameKey = "name",
    aspectRatio = 4 / 3,
    stroke = "#fff",
    colors = [],
    showTooltip = true,
    showValues = false
  } = config;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <Treemap
        data={data as unknown as Record<string, any>[]}
        dataKey={dataKey}
        nameKey={nameKey}
        aspectRatio={aspectRatio}
        stroke={stroke}
        content={(props: any) => (
          <CustomizedContent
            {...props}
            colors={colors}
            showValues={showValues}
          />
        )}
      >
        {showTooltip && <Tooltip />}
      </Treemap>
    </ResponsiveContainer>
  );
};

export default GenericTreemap;