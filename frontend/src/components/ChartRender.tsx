import React from "react";
import GenericBarChart from "../graphs/BarChart";
import GenericPieChart from "../graphs/PieChart";
import GenericAreaChart from "../graphs/AreaChart"; // ✅ IMPORT THIS

interface ChartPayload {
  id: string;
  title: string;
  type: "bar" | "pie" | "area";
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

    case "pie":
      return <GenericPieChart data={data} config={config} />;

    case "area":
      return <GenericAreaChart data={data} config={config} />; // ✅ FIXED

    default:
      return <p>Unsupported chart type: {type}</p>;
  }
};

export default ChartRenderer;