import React from "react";
import "./SocialMediaTabs.css";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const SocialMediaTabs: React.FC<Props> = ({ activeTab, setActiveTab }) => {

  const tabs = [
    { id: "sentiment", label: "Sentiment", icon: "bi-emoji-smile" },
    { id: "reviews", label: "Reviews", icon: "bi-chat-left-text" },
    { id: "audience", label: "Audience", icon: "bi-people" },
    { id: "ai", label: "AI Insights", icon: "bi-stars" }
  ];

  return (
    <div className="tabs-wrapper">

      <div className="social-tabs">

        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`bi ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}

      </div>

    </div>
  );
};

export default SocialMediaTabs;