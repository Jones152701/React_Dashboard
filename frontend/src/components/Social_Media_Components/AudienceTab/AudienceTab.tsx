import React from "react";
import ChartCard from "../ChartCard/ChartCard";
import ChartRenderer from "../../ChartRender";
import type { SocialMediaResponse } from "../../../types/socialMedia";
import "./audienceTab.css";

interface Props {
  data: SocialMediaResponse | null;
  loading: boolean;
}

interface UserData {
  username: string;
  mentions: number;
}

const AudienceTab: React.FC<Props> = ({ data, loading }) => {
  const charts = data?.charts || [];

  // Extract specific charts by ID (from backend)
  const getChart = (id: string) => charts.find((c) => c.id === id);

  const languageChart = getChart("language_distribution");
  const genderChart = getChart("gender_distribution");
  const activityHourChart = getChart("activity_by_hour");
  const activityDayChart = getChart("activity_by_day");

  const advocates = data?.top_advocates || [];
  const detractors = data?.top_detractors || [];

  /* ---------------- TABLE RENDERER ---------------- */

  const renderUserTable = (users: UserData[]) => {
    if (!users.length) {
      return <div className="text-center py-4 text-muted">No data</div>;
    }

    return (
      <div className="audience-table">
        {/* Header */}
        <div className="audience-header d-flex">
          <div className="col-user">User</div>
          <div className="col-mentions">Mentions</div>
        </div>

        {/* Rows */}
        {users.map((user, i) => {
          const firstLetter = user.username
            ? user.username.charAt(0).toUpperCase()
            : "?";

          return (
            <div key={i} className="audience-row d-flex align-items-center">
              {/* Avatar + Name */}
              <div className="col-user d-flex align-items-center gap-2">
                <div className="avatar-circle">
                  {firstLetter}
                </div>

                <div>
                  <div className="username-text">{user.username}</div>
                  <div className="text-muted small username-text">
                    @{user.username}
                  </div>
                </div>
              </div>

              {/* Mentions */}
              <div className="col-mentions fw-medium">
                {user.mentions}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ---------------- CHART RENDERER HELPER ---------------- */

  const renderChart = (chart: any, fallbackTitle: string) => {
    if (!chart) {
      return <div className="text-center py-4 text-muted">No data</div>;
    }

    // Check if chart has data
    if (!chart.data || chart.data.length === 0) {
      return <div className="text-center py-4 text-muted">No data available</div>;
    }

    return <ChartRenderer chart={chart} />;
  };

  /* ---------------- MAIN RENDER ---------------- */

  return (
    <div className="container-fluid">
      <div className="row g-4">

        {/* Language Distribution */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={languageChart?.title || "Language Distribution"}
            tooltip={languageChart?.tooltip || "Reviews across different languages"}
            icon={languageChart?.icon || "bi bi-translate me-2"}
            loading={loading}
          >
            {renderChart(languageChart, "Language Distribution")}
          </ChartCard>
        </div>

        {/* Gender Distribution */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={genderChart?.title || "Gender Distribution"}
            tooltip={genderChart?.tooltip || "Customer reviews by gender"}
            icon={genderChart?.icon || "bi bi-people-fill me-2"}
            loading={loading}
          >
            {renderChart(genderChart, "Gender Distribution")}
          </ChartCard>
        </div>

        {/* Top Advocates - Table */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title="Top Advocates"
            tooltip="Users with most positive mentions"
            icon="bi bi-megaphone-fill text-success me-2"
            loading={loading}
          >
            {renderUserTable(advocates)}
          </ChartCard>
        </div>

        {/* Top Detractors - Table */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title="Top Detractors"
            tooltip="Users with most negative mentions"
            icon="bi bi-chat-left-dots-fill text-danger me-2"
            loading={loading}
          >
            {renderUserTable(detractors)}
          </ChartCard>
        </div>

        {/* Activity by Hour */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={activityHourChart?.title || "Activity by Hour"}
            tooltip={activityHourChart?.tooltip || "Review distribution across hours"}
            icon={activityHourChart?.icon || "bi bi-clock-fill me-2"}
            loading={loading}
          >
            {renderChart(activityHourChart, "Activity by Hour")}
          </ChartCard>
        </div>

        {/* Activity by Day */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={activityDayChart?.title || "Activity by Day"}
            tooltip={activityDayChart?.tooltip || "Review distribution across days"}
            icon={activityDayChart?.icon || "bi bi-calendar-week-fill me-2"}
            loading={loading}
          >
            {renderChart(activityDayChart, "Activity by Day")}
          </ChartCard>
        </div>

      </div>
    </div>
  );
};

export default AudienceTab;