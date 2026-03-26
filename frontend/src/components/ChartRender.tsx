import React from "react";
import GenericBarChart from "../graphs/BarChart";
import GenericPieChart from "../graphs/PieChart";
import GenericAreaChart from "../graphs/AreaChart"; // ✅ IMPORT THIS
import GenericTreemap from "../graphs/TreeMap";
import StackedBarChart from "../graphs/StackedBarChart";

interface ChartPayload {
  id: string;
  title: string;
  type: "bar" | "pie" | "area" | "treemap" | "stackedbar";
  data: any[];
  config: any;
}

interface Props {
  chart: ChartPayload;
}

const ChartRenderer: React.FC<Props> = ({ chart }) => {
  const { type, data, config } = chart;

  switch (type) {
    case "bar":
      return <GenericBarChart data={data} config={config} />;

    case "stackedbar":
      return <StackedBarChart data={data} config={config} />;

    case "pie":
      return <GenericPieChart data={data} config={config} />;

    case "treemap":
      return <GenericTreemap data={data} config={config}/>;

    case "area":
      return <GenericAreaChart data={data} config={config} />; 

    default:
      return <p>Unsupported chart type: {type}</p>;
  }
};

export default ChartRenderer;