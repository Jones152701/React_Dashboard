import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Label,
  Cell,
} from "recharts";

import ChartCard from "../ChartCard/ChartCard";
import type { SocialMediaResponse } from "../../../types/socialMedia";
import './audienceTab.css';

interface Props {
  data: SocialMediaResponse | null;
  loading: boolean;
}

interface UserData {
  username: string;
  mentions: number;
}

const COLORS = ["#3b82f6", "#ec4899"];


const AudienceTab: React.FC<Props> = ({ data, loading }) => {
  // Extract data from props
  const languageData = data?.language_distribution || [];
  const genderData = data?.gender_distribution || [];
  const advocates = data?.top_advocates || [];
  const detractors = data?.top_detractors || [];
  const activityByHour = data?.activity_by_hour || [];
  const activityByDay = data?.activity_by_day || [];

  /* ---------------- Charts ---------------- */

  const renderLanguageChart = () => {
    if (!languageData.length) return <div className="text-center py-4 text-muted">No data</div>;

    return (
      <ResponsiveContainer width="95%" height={300}>
        <BarChart data={languageData} margin={{ top: 30, right: 0, left: 18, bottom: 43 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 11 }} interval={0}  >
            <Label value="Country" position="insideBottom" offset={-40} fill="#4d4747" />
          </XAxis>
          <YAxis tick={{ fontSize: 11 }}>
            <Label
              value="Number of Reviews"
              angle={-90}
              position="insideLeft"
              offset={-1}   // keep positive
              style={{ textAnchor: "middle" }}
              fill="#4d4747"
            />
          </YAxis>
          <Tooltip />
          <Bar dataKey="value" fill="#c093d0" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };


  const renderCustomLegend = () => {
    return (
      <div className="d-flex justify-content-center gap-4 mt-3 flex-wrap">
        {genderData.map((entry, index) => (
          <div key={index} className="d-flex align-items-center gap-2">

            {/* Color Dot */}
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: COLORS[index % COLORS.length],
              }}
            />

            {/* Text */}
            <span style={{ fontSize: 14, color: "#333" }}>
              {entry.name} - {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };


  const renderGenderChart = () => {
    if (!genderData.length) return null;

    return (
      <>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={genderData}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
            >
              {genderData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

        {/* 👇 Custom Legend */}
        {renderCustomLegend()}
      </>
    );
  };

  const renderUserTable = (data: UserData[]) => {
    if (!data.length) {
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
        {data.map((user, i) => {
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
                  <div className="text-muted small username-text">@{user.username}</div>
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

  const renderActivityByHour = () => {
    if (!activityByHour.length)
      return <div className="text-center py-4 text-muted">No data</div>;

    return (
      <ResponsiveContainer width="95%" height={350}>
        <BarChart
          data={activityByHour}
          margin={{ top: 30, right: 20, left: 20, bottom: -7 }}
        >
          <CartesianGrid vertical={false} />

          <XAxis
            dataKey="hour"
            angle={-45}
            textAnchor="end"
            interval={1}
            height={70}
            tick={{ fontSize: 10 }}
          >
            <Label
              value="Hour of Day"
              position="insideBottom"
              offset={10}
              fill="#4d4747"
            />
          </XAxis>

          <YAxis tick={{ fontSize: 11 }}>
            <Label
              value="Number of Activities"
              angle={-90}
              position="insideLeft"
              offset={-1}
              style={{ textAnchor: "middle" }}
              fill="#4d4747"
            />
          </YAxis>

          <Tooltip />
          <Bar dataKey="count" fill="#f8961e" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderActivityByDay = () => {
    if (!activityByDay.length)
      return <div className="text-center py-4 text-muted">No data</div>;

    return (
      <ResponsiveContainer width="95%" height={350}>
        <BarChart
          data={activityByDay}
          margin={{ top: 30, right: 20, left: 20, bottom: 37 }}
        >
          <CartesianGrid vertical={false} />

          <XAxis
            dataKey="day"
            interval={0}
            tick={{ fontSize: 9 }}
          >
            <Label
              value="Day of Week"
              position="insideBottom"
              offset={-29}
              fill="#4d4747"
            />
          </XAxis>

          <YAxis tick={{ fontSize: 11 }}>
            <Label
              value="Number of Activities"
              angle={-90}
              position="insideLeft"
              offset={-1}
              style={{ textAnchor: "middle" }}
              fill="#4d4747"
            />
          </YAxis>

          <Tooltip />
          <Bar dataKey="count" fill="#2d9cdb" radius={[20, 20, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="container-fluid">
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <ChartCard 
            title="Language Distribution"
            tooltip="Reviews across different languages"
            icon="bi bi-translate me-2"
            loading={loading} >
            {renderLanguageChart()}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard 
            title="Gender Distribution"
            tooltip=" Customer reviews by gender"
            icon="bi bi-people-fill me-2" 
            loading={loading}>
            {renderGenderChart()}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard 
            title="Top Advocates" 
            tooltip="Users with most positive mentions"
            icon="bi bi-megaphone-fill text-success me-2" 
            loading={loading}>
            {renderUserTable(advocates)}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard 
            title="Top Detractors" 
            tooltip=" Users with most negative mentions"
            icon="bi bi-chat-left-dots-fill text-danger me-2" 
            loading={loading}>
            {renderUserTable(detractors)}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard 
            title="Activity by Time of Day" 
            tooltip="  Review distribution across hours"
            icon="bi bi-clock-fill me-2" 
            loading={loading}>
            {renderActivityByHour()}
          </ChartCard>
        </div>

        <div className="col-12 col-lg-6">
          <ChartCard 
            title="Activity by Day of Week"  
            tooltip=" Review distribution across days"
            icon="bi bi-calendar-week-fill me-2" 
            loading={loading}>
            {renderActivityByDay()}
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default AudienceTab;