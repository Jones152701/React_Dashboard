import { useState, useEffect } from "react";
import Navbar from "../components/navbar/navbar";
import Header from "../components/header/header";
import SubHeader, { type FilterState } from "../components/Social_Media_Components/subheader/subheader";
import SocialMediaChart from "../components/Social_Media_Components/SentimentTab/SentimentTab";
import SocialMediaTabs from "../components/Social_Media_Components/SocialMediaTabs/SocialMediaTabs";
import ReviewTab from "../components/Social_Media_Components/ReviewTab/ReviewTab";
import AudienceTab from "../components/Social_Media_Components/AudienceTab/AudienceTab";
import AiInsightsTab from "../components/Social_Media_Components/AIInsightsTab/AIInsightsTab";
import type { SocialMediaResponse } from "../types/socialMedia";

import "../assets/css/social_media.css";

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
      dateRange: "last_7_days", // ✅ REQUIRED FIX
    };
  };

  const [filters, setFilters] = useState<FilterState>(getLast7Days());
  const [activeTab, setActiveTab] = useState("sentiment");

  // Shared data state for dashboard (charts only, no reviews)
  const [dashboardData, setDashboardData] = useState<SocialMediaResponse | null>(null);
  const [loading, setLoading] = useState(false);

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

        // IMPORTANT: No page, no search params here!
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
            <SocialMediaChart data={dashboardData} loading={loading} />
          )}

          {activeTab === "reviews" && (
            <ReviewTab
              filters={filters}  // Pass only filters, not dashboardData
            />
          )}

          {activeTab === "audience" && (
            <AudienceTab data={dashboardData} loading={loading} />
          )}

          {activeTab === "ai" && (
            <AiInsightsTab data={dashboardData} loading={loading} />
          )}
        </div>
      </div>
    </>
  );
}

export default SocialMedia;