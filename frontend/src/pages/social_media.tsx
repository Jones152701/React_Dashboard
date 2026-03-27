// social_media.tsx - Updated drilldown handler

import { useState, useEffect } from "react";
import Navbar from "../components/navbar/navbar";
import Header from "../components/header/header";
import SubHeader, { type FilterState } from "../components/Social_Media_Components/subheader/subheader";
import SocialMediaChart from "../components/Social_Media_Components/SentimentTab/SentimentTab";
import SocialMediaTabs from "../components/Social_Media_Components/SocialMediaTabs/SocialMediaTabs";
import ReviewTab from "../components/Social_Media_Components/ReviewTab/ReviewTab";
import AudienceTab from "../components/Social_Media_Components/AudienceTab/AudienceTab";
import AiInsightsTab from "../components/Social_Media_Components/AIInsightsTab/AIInsightsTab";
import Drilldown from "../components/Social_Media_Components/drilldown/Drilldown";
import type { SocialMediaResponse } from "../types/socialMedia";

import "../assets/css/social_media.css";

// Drill State Type
interface DrillState {
  open: boolean;
  loading: boolean;
  data: any | null;
  context: {
    key: string;
    value: any;
  } | null;
}

function SocialMedia() {
  const getLast7Days = (): FilterState => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);

    const format = (d: Date) =>
      d.toISOString().split("T")[0];

    return {
      fromDate: format(from),
      toDate: format(to),
      countries: ["all"],
      platforms: ["all"],
      sentiments: ["all"],
      dateRange: "last_7_days",
    };
  };

  const [filters, setFilters] = useState<FilterState>(getLast7Days());
  const [activeTab, setActiveTab] = useState("sentiment");

  // Shared data state for dashboard (charts only, no reviews)
  const [dashboardData, setDashboardData] = useState<SocialMediaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Drilldown state
  const [drill, setDrill] = useState<DrillState>({
    open: false,
    loading: false,
    data: null,
    context: null,
  });

  // Single API call for dashboard data (NO page, NO search)
  useEffect(() => {
    if (!filters.fromDate || !filters.toDate) return;

    const fetchDashboardData = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();

        params.append("from_date", filters.fromDate);
        params.append("to_date", filters.toDate);

        // Only add filters if they're not "all"
        if (filters.countries && !filters.countries.includes("all")) {
          params.append("countries", filters.countries.join(","));
        }

        if (filters.platforms && !filters.platforms.includes("all")) {
          params.append("platforms", filters.platforms.join(","));
        }

        if (filters.sentiments && !filters.sentiments.includes("all")) {
          params.append("sentiments", filters.sentiments.join(","));
        }

        console.log("Fetching dashboard data:", `http://localhost:8000/social_media/?${params.toString()}`);

        const response = await fetch(
          `http://localhost:8000/social_media/?${params.toString()}`
        );

        const result = await response.json();
        console.log("Dashboard response:", result);
        setDashboardData(result);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [filters]);

  /* ---------------- DRILLDOWN HANDLER (FIXED) ---------------- */

  const handleDrillDown = async (event: any) => {
    try {
      // ✅ STEP 1: Use the key directly from the chart (no mapping needed)
      // Charts already send the correct drillKey from their config
      
      const drillKey = event.key;
      const drillValue = event.value;

      console.log("Drill Event:", event);
      console.log("Using drillKey:", drillKey, "Value:", drillValue);

      // ✅ STEP 2: OPEN SIDEBAR
      setDrill({
        open: true,
        loading: true,
        data: null,
        context: {
          key: drillKey,
          value: drillValue,
        },
      });

      // ✅ STEP 3: BUILD REQUEST
      const params = new URLSearchParams();

      params.append("type", "drilldown");
      params.append("drill_key", drillKey);
      params.append("drill_value", drillValue);
      params.append("drill_type", event.type);

      // ✅ ADD FILTER CONTEXT
      params.append("from_date", filters.fromDate);
      params.append("to_date", filters.toDate);

      if (filters.countries && !filters.countries.includes("all")) {
        params.append("countries", filters.countries.join(","));
      }

      if (filters.platforms && !filters.platforms.includes("all")) {
        params.append("platforms", filters.platforms.join(","));
      }

      if (filters.sentiments && !filters.sentiments.includes("all")) {
        params.append("sentiments", filters.sentiments.join(","));
      }

      // ✅ OPTIONAL EXTRA CONTEXT
      if (event.data) {
        params.append("drill_context", JSON.stringify(event.data));
      }

      const url = `http://localhost:8000/social_media/?${params.toString()}`;
      console.log("Drilldown API:", url);

      // ✅ STEP 4: FETCH
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      // ✅ STEP 5: UPDATE STATE
      setDrill((prev) => ({
        ...prev,
        loading: false,
        data: result,
      }));

    } catch (err) {
      console.error("Drilldown error:", err);

      setDrill((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  /* ---------------- CLOSE DRILLDOWN SIDEBAR ---------------- */
  const handleCloseDrilldown = () => {
    setDrill({
      open: false,
      loading: false,
      data: null,
      context: null,
    });
  };

  return (
    <>
      <Header />
      <Navbar />

      <div className="page-wrap">
        <SubHeader onFiltersChange={setFilters} />

        <div className="analytics-content">
          {/* TABS */}
          <SocialMediaTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {activeTab === "sentiment" && (
            <SocialMediaChart
              data={dashboardData}
              loading={loading}
              onDrillDown={handleDrillDown}
            />
          )}

          {activeTab === "reviews" && (
            <ReviewTab
              filters={filters}
            />
          )}

          {activeTab === "audience" && (
            <AudienceTab
              data={dashboardData}
              loading={loading}
              onDrillDown={handleDrillDown}
            />
          )}

          {activeTab === "ai" && (
            <AiInsightsTab
              data={dashboardData}
              loading={loading}
              onDrillDown={handleDrillDown}
            />
          )}
        </div>
      </div>

      {/* ✅ FIXED: Drilldown Sidebar - pass drill object */}
      <Drilldown
        drill={drill}
        onClose={handleCloseDrilldown}
      />
    </>
  );
}

export default SocialMedia;