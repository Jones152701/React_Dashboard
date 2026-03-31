import React, { useEffect, useState } from "react";

import Header from "../components/header/header";
import Navbar from "../components/navbar/navbar";
import SecondaryHeader from "../components/competitors-components/secondary-header/SecondaryHeader";
import CompetitorCard from "../components/competitors-components/competitor-card/CompetitorCard";
import '../assets/css/Competitors.css'

import favicon from "../assets/images/favicon.ico";

interface Competitor {
  name: string;
  country: string;
  competitor_type: string;
}

const Competitors: React.FC = () => {

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 🔥 New state for search
  const [search, setSearch] = useState("");

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

        

        {/* 🔹 Cards */}
        <div className="analytics-content row mt-3">
            {/* 🔹 Search and Results UI */}
        <div className="d-flex justify-content-between align-items-center  mb-2">
          
          {/* 🔍 Search Input */}
          <div style={{ width: "300px" }}>
            <label className="fw-semibold text-muted small">SEARCH</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* 📊 Results Count */}
          <div>
            <label className="fw-semibold text-muted small">RESULTS</label>
            <div className="badge bg-primary" style={{ fontSize: "13px", padding: "6px 10px", borderRadius: "8px" }}>
              {filteredCompetitors.length} of {competitors.length} competitors
            </div>
          </div>
          
        </div>

        {/* 🔹 Loading */}
        {loading && (
          <div className="text-center mt-4">Loading...</div>
        )}
          {!loading && filteredCompetitors.length === 0 && (
            <div className="text-center text-muted">
              No competitors found
            </div>
          )}

          {/* 🔥 Use filteredCompetitors instead of competitors */}
          {filteredCompetitors.map((c) => (
            <div className="col-12 col-md-6 col-lg-3 mb-3" key={c.name}>
              <CompetitorCard
                name={c.name}
                type={c.competitor_type}
                country={c.country}
                image={`/logos/${c.name.toLowerCase()}.png`}
              />
            </div>
          ))}
        </div>

      </div>
    </>
  );
};

export default Competitors;