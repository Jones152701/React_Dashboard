import React, { useEffect, useState } from "react";
import axios from "axios";

import Header from "../components/header/header";
import Navbar from "../components/navbar/navbar";
import Filters from "../components/lens-analytics-components/filters/Filters";
import type { DateFilterState } from "../components/lens-analytics-components/filters/Filters";
import UserActivity from "../components/lens-analytics-components/lens-user/UserActivity";

import ChartCard from "../components/Social_Media_Components/ChartCard/ChartCard";
import ChartRenderer from "../components/ChartRender";
import Cards from "../components/cards/Cards";

import "../assets/css/LensAnalytics.css";

/* ================= TYPES ================= */

interface ChartResponse {
  id: string;
  title: string;
  type: "bar" | "pie" | "area" | "treemap";
  tooltip?: string;
  icon?: string;
  data: any[];
  config: any;
}

interface CardItem {
  value: number | string;
  count?: number;
  trend: {
    value: number;
    direction: "up" | "down" | "flat";
  };
}

interface ApiResponse {
  charts: ChartResponse[];
  users: string[];
  selected_user_messages: any[];
  cards: {
    total_messages: CardItem;
    unique_users: CardItem;
    avg_messages_per_user: CardItem;
    top_user: CardItem;
  };
}

/* ================= COMPONENT ================= */

const LenAnalytics: React.FC = () => {

  /* 🔹 Default last 7 days */
  const getLast7Days = (): DateFilterState => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 6);

    const format = (d: Date) => d.toISOString().split("T")[0];

    return {
      dateRange: "last_7",
      fromDate: format(from),
      toDate: format(today),
    };
  };

  /* 🔹 STATE */
  const [filters, setFilters] = useState<DateFilterState>(getLast7Days());
  const [charts, setCharts] = useState<ChartResponse[]>([]);
  const [cards, setCards] = useState<ApiResponse["cards"] | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= SVG TREND ARROW ================= */

  const getTrendSVG = (value: number) => {
    const isPositive = value > 0;
    const isNegative = value < 0;

    const color = isPositive
      ? "#198754"
      : isNegative
        ? "#dc3545"
        : "gray";

    const points = isPositive
      ? "1,20 10,10 18,15 39,2"
      : isNegative
        ? "1,4 10,14 18,9 39,22"
        : "1,12 39,12";

    const arrow = isPositive
      ? "30,2 39,2 39,10"
      : isNegative
        ? "30,22 39,22 39,14"
        : "33,7 39,12 33,17";

    return (
      <svg width="56" height="40" viewBox="0 0 40 24">
        <polyline
          points={points}
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <polyline
          points={arrow}
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  };

  /* ================= API CALL ================= */

  useEffect(() => {
    if (!filters.fromDate || !filters.toDate) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        const response = await axios.get<ApiResponse>(
          "http://localhost:8000/LensOverview/LensAnalytics",
          {
            params: {
              from_date: filters.fromDate,
              to_date: filters.toDate,
              user: selectedUser || undefined,
            },
          }
        );

        setCharts(response.data?.charts || []);
        setCards(response.data?.cards || null);
        setUsers(response.data?.users || []);
        setMessages(response.data?.selected_user_messages || []);

      } catch (error) {
        console.error("❌ API Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, selectedUser]);

  /* ================= FORMAT HELPERS ================= */

  const formatNumber = (value: number | string) => {
    const num = Number(value);
    if (isNaN(num)) return value;
    return num.toLocaleString();
  };

  /* ================= UI ================= */

  return (
    <>
      <Header />
      <Navbar />

      <div className="pagewrap">

        {/* Filters */}
        <Filters onFiltersChange={setFilters} />



        {/* ================= CHARTS SECTION ================= */}
        <div className="chart-container">

          {/* ================= KPI CARDS ================= */}
          {cards && (
            <div className="row g-3 mb-4 mt-1">
              <div className="col-12 col-md-6 col-xl">
                <Cards
                  title="Unique Users"
                  count={formatNumber(cards.unique_users.value)}
                  percentage={cards.unique_users.trend.value}
                  arrow={getTrendSVG(cards.unique_users.trend.value)}
                />
              </div>

              <div className="col-12 col-md-6 col-xl">
                <Cards
                  title="Total Messages"
                  count={formatNumber(cards.total_messages.value)}
                  percentage={cards.total_messages.trend.value}
                  arrow={getTrendSVG(cards.total_messages.trend.value)}
                />
              </div>

              <div className="col-12 col-md-6 col-xl">
                <Cards
                  title="Avg Msg / User"
                  count={Number(cards.avg_messages_per_user.value).toFixed(2)}
                  percentage={cards.avg_messages_per_user.trend.value}
                  arrow={getTrendSVG(cards.avg_messages_per_user.trend.value)}
                />
              </div>

              <div className="col-12 col-md-6 col-xl">
                <div className="h-100 shadow-sm rounded-3 bg-white p-3">
                  <div className="h6 mb-1 text-gray-600">
                    Top User
                  </div>
                  <div className="h5 fw-bold mb-1">
                    {cards.top_user.value}
                  </div>
                  <div className="text-muted">
                    {cards.top_user.count?.toLocaleString()} messages
                  </div>
                </div>
              </div>
            </div>
          )}
          {charts
            .filter((chart) => chart.id !== "user_daily")
            .map((chart, index) => (
              <ChartCard
                key={chart.id || index}
                title={chart.title}
                tooltip={chart.tooltip}
                icon={chart.icon}
                loading={loading}
              >
                <ChartRenderer chart={chart} />
              </ChartCard>
            ))}


          {/* ================= USER ACTIVITY COMPONENT ================= */}
          <UserActivity
            users={users}
            selectedUser={selectedUser}
            onUserChange={setSelectedUser}
            userDailyChart={charts.find((chart) => chart.id === "user_daily")}
            messages={messages}
            loading={loading}
          />
        </div>



      </div>
    </>
  );
};

export default LenAnalytics;