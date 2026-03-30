import React from "react";
import GenericBarChart from "../graphs/BarChart";
import GenericPieChart from "../graphs/PieChart";
import GenericAreaChart from "../graphs/AreaChart";
import GenericTreemap from "../graphs/TreeMap";
import StackedBarChart from "../graphs/StackedBarChart";

/* ================= TYPES ================= */

export interface DrillEvent {
  type: "bar" | "area" | "pie" | "word" | "treemap";
  key: string;
  value: any;
  data: any;
  secondaryKey?: string;   // ✅ For stacked bar: x-axis drill key
  secondaryValue?: any;    // ✅ For stacked bar: x-axis value
}

interface ChartPayload {
  id: string;
  title: string;
  type: "bar" | "pie" | "area" | "treemap" | "stackedbar";
  data: any[];
  config: any;
}

interface Props {
  chart: ChartPayload;
  onDrillDown?: (event: DrillEvent) => void;
  selectedValue?: any;
  drillKey?: string; // ✅ supports override
}

/* ================= COMPONENT ================= */

const ChartRenderer: React.FC<Props> = ({
  chart,
  onDrillDown,
  selectedValue,
  drillKey
}) => {
  const { type, data, config } = chart;

  // ✅ Priority: prop drillKey > config drillKey
  const resolvedDrillKey = drillKey || config?.drillKey;

  switch (type) {

    /* ================= BAR ================= */
    case "bar":
      return (
        <GenericBarChart
          data={data}
          config={config}
          onDrillDown={onDrillDown}
          selectedValue={selectedValue}
          drillKey={resolvedDrillKey}
        />
      );

    /* ================= STACKED BAR ================= */
    case "stackedbar":
      return (
        <StackedBarChart
          data={data}
          config={config}
          onDrillDown={onDrillDown}
          selectedValue={selectedValue}
          drillKey={resolvedDrillKey}
        />
      );

    /* ================= PIE ================= */
    case "pie":
      return (
        <GenericPieChart
          data={data}
          config={config}
          onDrillDown={onDrillDown}
          selectedValue={selectedValue}
          drillKey={resolvedDrillKey} 
        />
      );

    /* ================= TREEMAP ================= */
    case "treemap":
      return (
        <GenericTreemap
          data={data}
          config={config}
          onDrillDown={onDrillDown}
          selectedValue={selectedValue}
           drillKey={resolvedDrillKey}
        />
      );

    /* ================= AREA ================= */
    case "area":
      return (
        <GenericAreaChart
          data={data}
          config={config}
          onDrillDown={onDrillDown}
          selectedValue={selectedValue}
          drillKey={resolvedDrillKey}
        />
      );

    /* ================= FALLBACK ================= */
    default:
      return <p>Unsupported chart type: {type}</p>;
  }
};

export default ChartRenderer;