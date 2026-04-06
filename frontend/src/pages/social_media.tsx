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
import favicon from "../assets/images/favicon.ico"
import api from "../config";
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
  fetch?: (params: any) => void;
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

    const setFavicon = (iconPath: string) => {
  const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;

  if (link) {
    link.href = iconPath;
  } else {
    const newLink = document.createElement("link");
    newLink.rel = "icon";
    newLink.href = iconPath;
    document.head.appendChild(newLink);
  }
};

 useEffect(() => {
    document.title = "Social Media";
    setFavicon(favicon);
  }, []);

  // ✅ FIXED: Dashboard API call - NO drillKey logic here
  useEffect(() => {
    if (!filters.fromDate || !filters.toDate) return;

    const fetchDashboardData = async () => {
      setLoading(true);

      try {
        const params: Record<string, string> = {
          from_date: filters.fromDate,
          to_date: filters.toDate,
        };

        if (filters.countries && !filters.countries.includes("all")) {
          params.countries = filters.countries.join(",");
        }
        if (filters.platforms && !filters.platforms.includes("all")) {
          params.platforms = filters.platforms.join(",");
        }
        if (filters.sentiments && !filters.sentiments.includes("all")) {
          params.sentiments = filters.sentiments.join(",");
        }

        const { data } = await api.get("/social_media/", { params });
        console.log("Dashboard response:", data);
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [filters]);

  /* ---------------- DRILLDOWN FETCH (REUSABLE) ---------------- */

  const fetchDrilldown = async (drillKey: string, drillValue: any, drillKey2?: string | null, drillValue2?: string | null, page: number = 1) => {
    try {
      const params: Record<string, string> = {
        type: "drilldown",
        drill_key: drillKey,
        drill_value: drillValue,
        page: String(page),
        from_date: filters.fromDate,
        to_date: filters.toDate,
      };

      if (drillKey2 && drillValue2) {
        params.drill_key2 = drillKey2;
        params.drill_value2 = drillValue2;
      }

      if (filters.countries && !filters.countries.includes("all")) {
        params.countries = filters.countries.join(",");
      }
      if (filters.platforms && !filters.platforms.includes("all")) {
        params.platforms = filters.platforms.join(",");
      }
      if (filters.sentiments && !filters.sentiments.includes("all") && drillKey !== "sentiment") {
        params.sentiments = filters.sentiments.join(",");
      }

      const { data } = await api.get("/social_media/", { params });
      return data;
    } catch (err) {
      console.error("Drilldown fetch error:", err);
      return null;
    }
  };

  /* ---------------- DRILLDOWN HANDLER (FIXED) ---------------- */

  const handleDrillDown = async (event: any) => {
    try {
      // ✅ STEP 1: Extract primary drill key/value
      const drillKey = event.key;
      const drillValue = event.value;

      // ✅ Extract secondary drill key/value (for stacked bar segment clicks)
      const drillKey2 = event.secondaryKey || null;
      const drillValue2 = event.secondaryValue !== undefined ? String(event.secondaryValue) : null;

      console.log("Drill Event:", event);
      console.log("Primary:", drillKey, "=", drillValue);
      if (drillKey2) console.log("Secondary:", drillKey2, "=", drillValue2);

      // ✅ Create fetch function for pagination (no loading state — skeleton handled in Drilldown)
      const drillFetch = async (params: any) => {
        const page = params?.page || 1;

        const result = await fetchDrilldown(drillKey, drillValue, drillKey2, drillValue2, page);

        if (result) {
          setDrill((prev) => ({
            ...prev,
            data: result,
          }));
        }
      };

      // ✅ STEP 2: OPEN SIDEBAR with context + fetch function
      setDrill({
        open: true,
        loading: true,
        data: null,
        context: {
          key: drillKey,
          value: drillValue,
        },
        fetch: drillFetch,
      });

      // ✅ STEP 3: Initial fetch (page 1)
      const result = await fetchDrilldown(drillKey, drillValue, drillKey2, drillValue2, 1);

      // ✅ STEP 4: UPDATE STATE
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
      <div className={`app-layout ${drill.open ? "sidebar-open" : ""}`}>
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