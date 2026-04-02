import React, { useEffect, useState } from "react";
import { getCompetitorLogo } from "../utils/getCompetitorLogo";
import Header from "../components/header/header";
import Navbar from "../components/navbar/navbar";
import SecondaryHeader from "../components/competitors-components/secondary-header/SecondaryHeader";
import CompetitorCard from "../components/competitors-components/competitor-card/CompetitorCard";
import MatrixCarousel from "../components/competitors-components/matrix-carousel/MatrixCarousel";
import '../assets/css/Competitors.css'

import favicon from "../assets/images/favicon.ico";

interface Competitor {
  name: string;
  country: string;
  competitor_type: string;
}

interface MatrixSlide {
  tier: string;
  competitor_type?: string;
  html: string;
}

const Competitors: React.FC = () => {

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 🔥 State for search
  const [search, setSearch] = useState("");
  
  // 🔹 State for matrix slides (carousel)
  const [matrixSlides, setMatrixSlides] = useState<MatrixSlide[]>([]);

  const [filters, setFilters] = useState({
    country: "United Kingdom",
    competitor_type: "all"
  });

  /* 🔹 favicon */
  const setFavicon = (iconPath: string) => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (link) link.href = iconPath;
  };

  useEffect(() => {
    document.title = "Competitors Plans";
    setFavicon(favicon);
  }, []);

  /* ================= API CALL ================= */

  const fetchData = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (filters.country !== "all") {
        params.append("country", filters.country);
      }

      if (filters.competitor_type !== "all") {
        params.append("competitor_type", filters.competitor_type);
      }

      const url = `http://localhost:8000/competitors-plan?${params.toString()}`;
      console.log("API:", url);

      const response = await fetch(url);
      const data = await response.json();

      setCompetitors(data.data.competitors || []);
      setCountries(data.filters.countries || []);
      setTypes(data.filters.competitor_types || []);
      
      // 🔹 Set matrix slides from API
      setMatrixSlides(data.data.matrix_slides || []);

    } catch (err) {
      console.error("API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* 🔁 Trigger API when filters change */
  useEffect(() => {
    fetchData();
  }, [filters]);
  
  /* 🔥 Filter competitors based on search */
  const filteredCompetitors = competitors.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= UI ================= */

  return (
    <>
      <Header />
      <Navbar />

      <div className="pagewrap">

        {/* 🔹 Filters */}
        <SecondaryHeader
            countries={countries}
            competitorTypes={types}
            onFilterChange={setFilters}
            defaultFilters={filters}
            />

        {/* 🔹 Main Content */}
        <div className="analyticscontent">
            
          {/* ─── Search & Results Bar ─── */}
          <div className="competitors-toolbar">
            
            {/* 🔍 Search Input */}
            <div className="competitors-search-wrapper">
              <i className="bi bi-search competitors-search-icon"></i>
              <input
                type="text"
                className="competitors-search-input"
                placeholder="Search competitors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="competitors-search-clear"
                  onClick={() => setSearch("")}
                  title="Clear search"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
            
            {/* 📊 Results Count */}
            <div className="competitors-results-badge">
              <span className="competitors-results-count">{filteredCompetitors.length}</span>
              <span className="competitors-results-label">
                of {competitors.length} competitors
              </span>
            </div>
            
          </div>

          {/* ─── Cards Grid ─── */}
          <div className="competitors-grid">
            
            {/* 🔹 Loading */}
            {loading && (
              <div className="competitors-empty-state">
                <div className="competitors-spinner"></div>
                <p>Loading competitors...</p>
              </div>
            )}

            {/* 🔹 No results */}
            {!loading && filteredCompetitors.length === 0 && (
              <div className="competitors-empty-state">
                <i className="bi bi-search" style={{ fontSize: 32, opacity: 0.3 }}></i>
                <p>No competitors found</p>
                {search && (
                  <button
                    className="competitors-clear-btn"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* 🔥 Cards */}
            {!loading && filteredCompetitors.map((c) => (
              <div className="competitors-card-col" key={c.name}>
                <CompetitorCard
                  name={c.name}
                  type={c.competitor_type}
                  country={c.country}
                  image={getCompetitorLogo(c.name)}
                />
              </div>
            ))}
          </div>

          {/* ─── Plans Overview Carousel ─── */}
          {!loading && matrixSlides.length > 0 && (
            <div className="competitors-matrix-section">
              <h5 className="competitors-matrix-title">
                <i className="bi bi-table"></i>
                Plans Overview
              </h5>
              <MatrixCarousel slides={matrixSlides} />
            </div>
          )}

        </div>

      </div>
    </>
  );
};

export default Competitors;