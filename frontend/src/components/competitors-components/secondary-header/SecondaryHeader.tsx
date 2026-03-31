import React from "react";
import "./SecondaryHeader.css";

interface FiltersState {
  country: string;
  competitor_type: string;
}

interface FiltersProps {
  title?: string;
  countries: string[];
  competitorTypes: string[];
  onFilterChange?: (filters: FiltersState) => void;
  defaultFilters?: FiltersState;
  className?: string;
}

/* 🔹 Helper function */
const getCountryCode = (country: string): string => {
  const map: Record<string, string> = {
    "United Kingdom": "gb",
    "United States": "us",
    "India": "in",
    "Canada": "ca",
    "Australia": "au",
    "Germany": "de",
    "France": "fr",
    "Spain": "es",
    "Italy": "it",
    "Netherlands": "nl",
    "Sweden": "se",
    "Norway": "no",
    "Denmark": "dk",
    "Belgium": "be",
    "Switzerland": "ch",
    "Austria": "at",
    "Ireland": "ie",
    "Poland": "pl",
    "Portugal": "pt"
  };
  return map[country] || "un";
};

const SecondaryHeader: React.FC<FiltersProps> = ({
  title = "Competitors Plan",
  countries = [],
  competitorTypes = [],
  onFilterChange,
  defaultFilters,
  className = "",
}) => {

  /* ✅ STATE */
  const [filters, setFilters] = React.useState<FiltersState>(
    defaultFilters || {
      country: "United Kingdom",
      competitor_type: "all"
    }
  );

  const [open, setOpen] = React.useState(false);

  /* ✅ SYNC WITH PARENT */
  React.useEffect(() => {
    if (defaultFilters) {
      setFilters(defaultFilters);
    }
  }, [defaultFilters]);

  /* ✅ UPDATE FILTER */
  const updateFilter = (key: keyof FiltersState, value: string) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  /* ✅ SELECT COUNTRY */
  const handleCountrySelect = (value: string) => {
    updateFilter("country", value);
    setOpen(false);
  };

  /* ✅ OUTSIDE CLICK FIX (IMPORTANT) */
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest(".custom-dropdown")) {
        setOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className={`filters-container ${className}`}>

      {/* 🔹 Title */}
      {title && (
        <div className="filters-title">
          <h3>{title}</h3>
        </div>
      )}

      <div className="filters-right">

        {/* ✅ COUNTRY DROPDOWN */}
        <div className="filter-group">
          <label className="filter-label">Country</label>

          <div className="custom-dropdown">

            {/* Selected */}
            <div
              className="country-dropdown-selected"
              onClick={(e) => {
                e.stopPropagation();   // 🔥 FIX
                setOpen(prev => !prev);
              }}
            >
              {filters.country !== "all" && (
                <img
                  src={`https://flagcdn.com/w20/${getCountryCode(filters.country)}.png`}
                  alt=""
                />
              )}

              <span>
                {filters.country === "all"
                  ? "All Countries"
                  : filters.country}
              </span>

              <span className="arrow">{open ? '▲' : '▼'}</span>
            </div>

            {/* Dropdown */}
            {open && (
              <div className="country-dropdown-list">

                {/* All */}
                <div
                  className={`country-dropdown-item ${filters.country === "all" ? "active" : ""}`}
                  onClick={() => handleCountrySelect("all")}
                >
                  <span className="country-flag-placeholder"></span>
                 
                </div>

                {/* Countries */}
                {countries.map((c) => (
                  <div
                    key={c}
                    className={`country-dropdown-item ${filters.country === c ? "active" : ""}`}
                    onClick={() => handleCountrySelect(c)}
                  >
                    <img
                      src={`https://flagcdn.com/w20/${getCountryCode(c)}.png`}
                      alt={c}
                    />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* ✅ TYPE DROPDOWN */}
        <div className="filter-group">
          <label className="filter-label">Type</label>
          <select
            className="filter-select"
            value={filters.competitor_type}
            onChange={(e) =>
              updateFilter("competitor_type", e.target.value)
            }
          >
            <option value="all">All Types</option>
            {competitorTypes
              .filter((t) => t !== "all")
              .map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()}
                </option>
              ))}
          </select>
        </div>

      </div>
    </div>
  );
};

export default SecondaryHeader;