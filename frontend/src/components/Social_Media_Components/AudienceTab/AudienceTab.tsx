import React from "react";
import ChartCard from "../ChartCard/ChartCard";
import ChartRenderer from "../../ChartRender";
import type { DrillEvent } from "../../ChartRender";
import type { SocialMediaResponse } from "../../../types/socialMedia";
import "./audienceTab.css";

/* ---------------- TYPES ---------------- */

interface Props {
  data: SocialMediaResponse | null;
  loading: boolean;
  onDrillDown?: (event: DrillEvent) => void;
}

interface UserData {
  username: string;
  mentions: number;
}

type UserConfig = {
  title?: string;
  tooltip?: string;
  icon?: string;
};

/* ---------------- COMPONENT ---------------- */

const AudienceTab: React.FC<Props> = ({ data, loading, onDrillDown }) => {
  const charts = data?.charts || [];

  /* ---------------- GET CHART ---------------- */
  const getChart = (id: string) => charts.find((c) => c.id === id);

  const languageChart = getChart("language_distribution");
  const genderChart = getChart("gender_distribution");
  const activityHourChart = getChart("activity_by_hour");
  const activityDayChart = getChart("activity_by_day");

  /* ---------------- DATA + CONFIG (SAFE DEFAULTS) ---------------- */

  const advocatesData: UserData[] = data?.top_advocates?.data ?? [];
  const advocatesConfig: Required<UserConfig> = {
    title: data?.top_advocates?.config?.title || "Top Advocates",
    tooltip:
      data?.top_advocates?.config?.tooltip ||
      "Users with most positive mentions",
    icon:
      data?.top_advocates?.config?.icon ||
      "bi bi-megaphone-fill text-success",
  };

  const detractorsData: UserData[] = data?.top_detractors?.data ?? [];
  const detractorsConfig: Required<UserConfig> = {
    title: data?.top_detractors?.config?.title || "Top Detractors",
    tooltip:
      data?.top_detractors?.config?.tooltip ||
      "Users with most negative mentions",
    icon:
      data?.top_detractors?.config?.icon ||
      "bi bi-chat-left-dots-fill text-danger",
  };

  /* ---------------- TABLE (CLICKABLE ROWS) ---------------- */

  const renderUserTable = (users: UserData[], drillKey: string) => {
    if (!users.length) {
      return <div className="text-center py-4 text-muted">No data</div>;
    }

    return (
      <div className="audience-table">
        <div className="audience-header d-flex">
          <div className="col-user">User</div>
          <div className="col-mentions">Mentions</div>
        </div>

        {users.map((user, i) => {
          const firstLetter = user.username?.charAt(0).toUpperCase() || "?";

          return (
            <div
              key={i}
              className={`audience-row d-flex align-items-center ${
                onDrillDown ? "audience-row--clickable" : ""
              }`}
              onClick={() => {
                if (onDrillDown) {
                  onDrillDown({
                    type: "bar",
                    key: drillKey,
                    value: user.username,
                    data: user,
                  });
                }
              }}
            >
              <div className="col-user d-flex align-items-center gap-2">
                <div className="avatar-circle">{firstLetter}</div>

                <div>
                  <div className="username-text">{user.username}</div>
                  <div className="text-muted small">@{user.username}</div>
                </div>
              </div>

              <div className="col-mentions fw-medium">
                {user.mentions}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ---------------- CHART RENDER ---------------- */

  const renderChart = (chart: any) => {
    if (!chart || !chart.data?.length) {
      return <div className="text-center py-4 text-muted">No data</div>;
    }

    return (
      <ChartRenderer
        chart={chart}
        onDrillDown={onDrillDown}
      />
    );
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div className="container-fluid">
      <div className="row g-4">

        {/* LANGUAGE */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={languageChart?.title || "Language Distribution"}
            tooltip={languageChart?.tooltip}
            icon={languageChart?.icon || "bi bi-translate"}
            loading={loading}
          >
            {renderChart(languageChart)}
          </ChartCard>
        </div>

        {/* GENDER */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={genderChart?.title || "Gender Distribution"}
            tooltip={genderChart?.tooltip}
            icon={genderChart?.icon || "bi bi-people-fill"}
            loading={loading}
          >
            {renderChart(genderChart)}
          </ChartCard>
        </div>

        {/* ADVOCATES */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={advocatesConfig.title}
            tooltip={advocatesConfig.tooltip}
            icon={advocatesConfig.icon}
            loading={loading}
          >
            {renderUserTable(advocatesData, "advocate")}
          </ChartCard>
        </div>

        {/* DETRACTORS */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={detractorsConfig.title}
            tooltip={detractorsConfig.tooltip}
            icon={detractorsConfig.icon}
            loading={loading}
          >
            {renderUserTable(detractorsData, "detractor")}
          </ChartCard>
        </div>

        {/* ACTIVITY BY HOUR */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={activityHourChart?.title || "Activity by Hour"}
            tooltip={activityHourChart?.tooltip}
            icon={activityHourChart?.icon || "bi bi-clock-fill"}
            loading={loading}
          >
            {renderChart(activityHourChart)}
          </ChartCard>
        </div>

        {/* ACTIVITY BY DAY */}
        <div className="col-12 col-lg-6">
          <ChartCard
            title={activityDayChart?.title || "Activity by Day"}
            tooltip={activityDayChart?.tooltip}
            icon={activityDayChart?.icon || "bi bi-calendar-week-fill"}
            loading={loading}
          >
            {renderChart(activityDayChart)}
          </ChartCard>
        </div>

      </div>
    </div>
  );
};

export default AudienceTab;