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

  /* ───────── DEBOUNCE HANDLER ───────── */
  const debounceEmit = (newFrom: string, newTo: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      emitChange({
        fromDate: newFrom,
        toDate: newTo,
        dateRange: "custom",
      });
    }, 400);
  };

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

    if (newFrom && toDate) {
      debounceEmit(newFrom, toDate);
    }
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = e.target.value;
    setToDate(newTo);
    setDateRange("custom");

    if (fromDate && newTo) {
      debounceEmit(fromDate, newTo);
    }
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

    // 🔥 Immediate API call (no debounce)
    emitChange({
      fromDate: formattedFrom,
      toDate: formattedTo,
      dateRange: range,
    });
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
      </div>
    </div>
  );
};

export default Filters;