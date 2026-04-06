import React, { useState, useEffect, useRef } from "react";
import "./Filters.css";

export interface DateFilterState {
  dateRange: string;
  fromDate: string;
  toDate: string;
}

interface FiltersProps {
  title?: string;
  initialFromDate?: string;
  initialToDate?: string;
  onFiltersChange?: (filters: DateFilterState) => void;
  className?: string;
}

/* ───────── DATE HELPERS ───────── */

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayISO = () => formatLocalDate(new Date());

const daysAgoISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatLocalDate(d);
};

/* ───────── COMPONENT ───────── */

const Filters: React.FC<FiltersProps> = ({
  title = "Lens Usage Statistics",
  initialFromDate = daysAgoISO(6),
  initialToDate = todayISO(),
  onFiltersChange,
  className = "",
}) => {
  const [dateRange, setDateRange] = useState("last_7");
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ───────── SAFE EMIT FUNCTION ───────── */
  const emitChange = (newState: DateFilterState) => {
    onFiltersChange?.(newState);
  };

  /* ───────── NO MORE AUTO DEBOUNCE ───────── */
  // The user now must explicitly click 'Apply' for custom dates

  /* ───────── CLEANUP ───────── */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /* ───────── HANDLERS ───────── */

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = e.target.value;
    setFromDate(newFrom);
    setDateRange("custom");
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = e.target.value;
    setToDate(newTo);
    setDateRange("custom");
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    setDateRange(range);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newFrom: Date = new Date(today);
    let newTo: Date = new Date(today);

    switch (range) {
      case "today":
        break;

      case "yesterday":
        newFrom.setDate(today.getDate() - 1);
        newTo = new Date(newFrom);
        break;

      case "last_7":
        newFrom.setDate(today.getDate() - 6);
        break;

      case "last_30":
        newFrom.setDate(today.getDate() - 29);
        break;

      case "this_week": {
        const day = today.getDay();
        const diff = day === 0 ? 6 : day - 1;
        newFrom.setDate(today.getDate() - diff);
        break;
      }

      case "this_month":
        newFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        break;

      default:
        return;
    }

    const formattedFrom = formatLocalDate(newFrom);
    const formattedTo = formatLocalDate(newTo);

    setFromDate(formattedFrom);
    setToDate(formattedTo);
  };

  return (
    <div className={`filters-container ${className}`}>
      {title && (
        <div className="filters-title">
          <h3>{title}</h3>
        </div>
      )}

      <div className="filters-right">
        {/* Date Range */}
        <div className="filter-group">
          <label className="filter-label">Date Range</label>
          <select
            className="filter-select"
            value={dateRange}
            onChange={handleDateRangeChange}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7">Last 7 Days</option>
            <option value="last_30">Last 30 Days</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
          </select>
        </div>

        {/* From */}
        <div className="filter-group">
          <label className="filter-label">From</label>
          <input
            type="date"
            className="filter-select"
            value={fromDate}
            max={toDate}
            onChange={handleFromDateChange}
          />
        </div>

        {/* To */}
        <div className="filter-group">
          <label className="filter-label">To</label>
          <input
            type="date"
            className="filter-select"
            value={toDate}
            min={fromDate}
            onChange={handleToDateChange}
          />
        </div>

        {/* Apply Button */}
        <div className="filter-group">
          <label className="filter-label" style={{ opacity: 0, visibility: 'hidden' }}>&nbsp;</label>
          <button
            style={{
              height: "38px",
              backgroundColor: "#7B61FF",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              padding: "0 20px",
              boxShadow: "0 2px 8px rgba(123, 97, 255, 0.2)",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#6A52E8"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#7B61FF"; e.currentTarget.style.transform = "translateY(0)"; }}
            onClick={() => emitChange({ fromDate, toDate, dateRange: "custom" })}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default Filters;