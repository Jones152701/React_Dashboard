import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import type { Variants, TargetAndTransition } from "framer-motion";
import "./subheader.css"

// ── Inject CDN links once ─────────────────────────────────────────────────

const injectLink = (href: string) => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

injectLink('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
injectLink('https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/6.6.6/css/flag-icons.min.css');

// ── Animation variants ────────────────────────────────────────────────────

const dropdownVariants: Variants = {
  open: {
    scaleY: 1,
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.05,
      duration: 0.2,
    },
  },
  closed: {
    scaleY: 0,
    opacity: 0,
    transition: {
      when: "afterChildren",
      staggerChildren: 0.03,
      staggerDirection: -1,
      duration: 0.15,
    },
  },
};

const itemVariants: Variants = {
  open: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
  closed: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15 },
  },
};

// Animation for date inputs and selects - separate from initial mount
const controlVariants: Variants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
  tap: { scale: 0.98 },
};

// Animation for the container of each filter group
// Using TargetAndTransition return type for proper function variant support
const filterGroupVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number): TargetAndTransition => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: "easeOut"
    }
  })
};

// ── Debounce utility with proper typing ───────────────────────────────────

type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

// ── Types ─────────────────────────────────────────────────────────────────

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface FilterState {
  sentiments: string[];
  countries: string[];
  platforms: string[];
  dateRange: string;
  fromDate: string;
  toDate: string;
}

interface SubHeaderProps {
  title?: string;
  countries?: string[];
  platforms?: string[];
  initialFromDate?: string;
  initialToDate?: string;
  onFiltersChange?: (filters: FilterState) => void;
}

// ── Static sentiment options ──────────────────────────────────────────────

const SENTIMENT_OPTIONS: Option[] = [
  {
    value: 'positive',
    label: 'Positive',
    icon: <i className="fas fa-smile" style={{ color: '#22c55e', fontSize: '1rem' }} />,
  },
  {
    value: 'neutral',
    label: 'Neutral',
    icon: <i className="fas fa-meh" style={{ color: '#94a3b8', fontSize: '1rem' }} />,
  },
  {
    value: 'negative',
    label: 'Negative',
    icon: <i className="fas fa-frown" style={{ color: '#ef4444', fontSize: '1rem' }} />,
  },
];

// ── Date range options ────────────────────────────────────────────────────

const DATE_RANGE_OPTIONS = [
  { value: 'last_7', label: 'Last 7 Days' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
];

// ── Country → ISO flag code ───────────────────────────────────────────────

const COUNTRY_FLAG_MAP: Record<string, string> = {
  'USA': 'us', 'United States': 'us',
  'United Kingdom': 'gb', 'UK': 'gb', 'England': 'gb',
  'Canada': 'ca', 'Australia': 'au', 'Germany': 'de',
  'France': 'fr', 'China': 'cn', 'India': 'in',
  'Brazil': 'br', 'Spain': 'es', 'Italy': 'it',
  'Russia': 'ru', 'Netherlands': 'nl', 'Sweden': 'se',
  'Norway': 'no', 'Denmark': 'dk', 'Switzerland': 'ch',
  'Austria': 'at', 'Belgium': 'be', 'Portugal': 'pt',
  'Greece': 'gr', 'Turkey': 'tr', 'Israel': 'il',
  'Saudi Arabia': 'sa', 'UAE': 'ae', 'United Arab Emirates': 'ae',
  'Singapore': 'sg', 'Malaysia': 'my', 'Indonesia': 'id',
  'Philippines': 'ph', 'Thailand': 'th', 'Vietnam': 'vn',
  'South Africa': 'za', 'Nigeria': 'ng', 'Kenya': 'ke',
  'Egypt': 'eg', 'Argentina': 'ar', 'Chile': 'cl',
  'Colombia': 'co', 'Peru': 'pe', 'New Zealand': 'nz',
  'Uganda': 'ug', 'Japan': 'jp', 'South Korea': 'kr',
  'Mexico': 'mx', 'Poland': 'pl', 'Czech Republic': 'cz',
  'Hungary': 'hu', 'Romania': 'ro', 'Ukraine': 'ua',
};

const getCountryFlag = (country: string): React.ReactNode => {
  const code = COUNTRY_FLAG_MAP[country] ?? country.slice(0, 2).toLowerCase();
  return <span className={`fi fi-${code}`} style={{ fontSize: '1.1rem', borderRadius: '2px' }} />;
};

// ── Platform → Font Awesome icon ─────────────────────────────────────────

const getPlatformIcon = (p: string): React.ReactNode => {
  if (/reddit/i.test(p)) return <i className="fab fa-reddit-alien" style={{ color: '#FF4500', fontSize: '1rem' }} />;
  if (/youtube/i.test(p)) return <i className="fab fa-youtube" style={{ color: '#FF0000', fontSize: '1rem' }} />;
  if (/google/i.test(p)) return <i className="fab fa-google" style={{ color: '#4285F4', fontSize: '1rem' }} />;
  if (/amazon/i.test(p)) return <i className="fab fa-amazon" style={{ color: '#FF9900', fontSize: '1rem' }} />;
  if (/quora/i.test(p)) return <i className="fab fa-quora" style={{ color: '#B92B27', fontSize: '1rem' }} />;
  if (/facebook|^fb$/i.test(p)) return <i className="fab fa-facebook" style={{ color: '#1877F2', fontSize: '1rem' }} />;
  if (/twitter|^x$/i.test(p)) return <i className="fab fa-twitter" style={{ color: '#1DA1F2', fontSize: '1rem' }} />;
  if (/instagram/i.test(p)) return <i className="fab fa-instagram" style={{ color: '#E4405F', fontSize: '1rem' }} />;
  if (/linkedin/i.test(p)) return <i className="fab fa-linkedin" style={{ color: '#0A66C2', fontSize: '1rem' }} />;
  if (/pinterest/i.test(p)) return <i className="fab fa-pinterest" style={{ color: '#BD081C', fontSize: '1rem' }} />;
  if (/tiktok/i.test(p)) return <i className="fab fa-tiktok" style={{ color: '#010101', fontSize: '1rem' }} />;
  if (/snapchat/i.test(p)) return <i className="fab fa-snapchat" style={{ color: '#FFCC00', fontSize: '1rem' }} />;
  if (/whatsapp/i.test(p)) return <i className="fab fa-whatsapp" style={{ color: '#25D366', fontSize: '1rem' }} />;
  if (/telegram/i.test(p)) return <i className="fab fa-telegram" style={{ color: '#26A5E4', fontSize: '1rem' }} />;
  if (/discord/i.test(p)) return <i className="fab fa-discord" style={{ color: '#5865F2', fontSize: '1rem' }} />;
  if (/trustpilot/i.test(p)) return <i className="fas fa-star" style={{ color: '#00B67A', fontSize: '1rem' }} />;
  return <i className="fas fa-comment" style={{ color: '#6c757d', fontSize: '1rem' }} />;
};

// ── DATE HELPERS (FIXED - No UTC issues) ─────────────────────────────────

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayISO = (): string => {
  return formatLocalDate(new Date());
};

const daysAgoISO = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatLocalDate(date);
};

const formatDate = (date: Date): string => {
  return formatLocalDate(date);
};

// ── MultiSelect dropdown ──────────────────────────────────────────────────

interface MultiSelectProps {
  id: string;
  label: string;
  labelIcon: React.ReactNode;
  allLabel: string;
  allIcon?: React.ReactNode;
  options: Option[];
  selected: string[];
  onChange: (vals: string[]) => void;
  index: number; // Make index required
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  id, label, labelIcon, allLabel, allIcon, options, selected, onChange, index,
}) => {
  const [local, setLocal] = useState<string[]>(selected);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocal(selected); }, [selected]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const isAll = local.includes('all');

  const toggleAll = () => setLocal(['all']);

  const toggleOne = (val: string) => {
    const without = local.filter(v => v !== 'all');
    if (without.includes(val)) {
      const next = without.filter(v => v !== val);
      setLocal(next.length === 0 ? ['all'] : next);
    } else {
      setLocal([...without, val]);
    }
  };

  const clear = () => setLocal(['all']);
  const apply = () => { onChange(local); setOpen(false); };

  const btnLabel = isAll
    ? allLabel
    : local.length === 1
      ? options.find(o => o.value === local[0])?.label ?? allLabel
      : `${local.length} selected`;

  return (
    <motion.div
      className="filter-group"
      ref={ref}
      custom={index}
      initial="hidden"
      animate="visible"
      variants={filterGroupVariants}
      whileHover="hover"
    >
      <label className="filter-label">
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 + 0.1 }}
        >
          {labelIcon}&nbsp;{label}
        </motion.span>
      </label>

      <div className="dropdown multi-select-dropdown">
        <motion.button
          className={`btn btn-light dropdown-toggle filter-select w-100 text-start ${open ? 'active' : ''}`}
          type="button"
          id={`${id}DropdownBtn`}
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          whileTap="tap"
          variants={controlVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: index * 0.05 + 0.15 }}
        >
          <span>{btnLabel}</span>
          <motion.i
            className="fas fa-chevron-down sh-chevron"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          />
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              key="dropdown"
              initial="closed"
              animate="open"
              exit="closed"
              variants={dropdownVariants}
              style={{ originY: "top" }}
              className="dropdown-menu show sh-dropdown-panel"
              aria-labelledby={`${id}DropdownBtn`}
            >
              {/* All option */}
              <motion.div
                variants={itemVariants}
                className="form-check sh-option sh-option-all"
                onClick={toggleAll}
              >
                <input
                  className="form-check-input sh-check"
                  type="checkbox"
                  readOnly
                  checked={isAll}
                  id={`${id}All`}
                />
                <label className="form-check-label sh-check-label" htmlFor={`${id}All`}>
                  {allIcon && <span className="sh-opt-icon">{allIcon}</span>}
                  <strong>{allLabel}</strong>
                </label>
              </motion.div>

              {/* Individual options */}
              {options.map((opt, i) => (
                <motion.div
                  key={opt.value}
                  variants={itemVariants}
                  className="form-check sh-option"
                  onClick={() => toggleOne(opt.value)}
                >
                  <input
                    className="form-check-input sh-check"
                    type="checkbox"
                    readOnly
                    checked={local.includes(opt.value)}
                    id={`${id}_opt_${i}`}
                  />
                  <label className="form-check-label sh-check-label" htmlFor={`${id}_opt_${i}`}>
                    {opt.icon && <span className="sh-opt-icon">{opt.icon}</span>}
                    {opt.label}
                  </label>
                </motion.div>
              ))}

              <hr className="dropdown-divider" />
              <div className="sh-dropdown-footer">
                <motion.button
                  className="sh-btn-clear"
                  type="button"
                  onClick={clear}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Clear
                </motion.button>
                <motion.button
                  className="sh-btn-apply"
                  type="button"
                  onClick={apply}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Apply
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ── Main SubHeader ────────────────────────────────────────────────────────

const SubHeader: React.FC<SubHeaderProps> = ({
  title = 'Social Media Analytics',
  countries = ['Belgium', 'France', 'Germany', 'Italy', 'Netherlands', 'Portugal', 'Uganda', 'UK'],
  platforms = ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'trustpilot', 'twitter'],
  initialFromDate = daysAgoISO(6),
  initialToDate = todayISO(),
  onFiltersChange,
}) => {
  const [sentiments, setSentiments] = useState<string[]>(['all']);
  const [selCountries, setSelCountries] = useState<string[]>(['all']);
  const [selPlatforms, setSelPlatforms] = useState<string[]>(['all']);
  const [dateRange, setDateRange] = useState('last_7');
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);

  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);

  const notify = (overrides?: Partial<FilterState>) => {
    onFiltersChange?.({
      sentiments,
      countries: selCountries,
      platforms: selPlatforms,
      dateRange,
      fromDate,
      toDate,
      ...overrides,
    });
  };

  // Create debounced notify function for date changes
  const debouncedNotify = useRef(
    debounce((newFrom: string, newTo: string) => {
      if (newFrom && newTo) {
        notify({
          fromDate: newFrom,
          toDate: newTo,
          dateRange: 'custom',
        });
      }
    }, 500)
  ).current;




  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = e.target.value;

    // ❌ Ignore if same value (month navigation)
    if (newFrom === fromDate) return;

    setFromDate(newFrom);
    setDateRange('custom');

    // ✅ Only fire when both dates exist
    if (newFrom && toDate) {
      notify({
        fromDate: newFrom,
        toDate: toDate,
        dateRange: 'custom',
      });
    }
  };


  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = e.target.value;

    // ❌ Ignore if same value
    if (newTo === toDate) return;

    setToDate(newTo);
    setDateRange('custom');

    if (fromDate && newTo) {
      notify({
        fromDate: fromDate,
        toDate: newTo,
        dateRange: 'custom',
      });
    }
  };

  // Handle Enter key for immediate update
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && fromDate && toDate) {
      // Cancel any pending debounced calls
      debouncedNotify.cancel();
      // Trigger immediate update
      notify({
        fromDate: fromDate,
        toDate: toDate,
        dateRange: 'custom',
      });
    }
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    setDateRange(range);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newFromDate: Date;
    let newToDate: Date = new Date(today);

    switch (range) {
      case "today":
        newFromDate = new Date(today);
        newToDate = new Date(today);
        break;

      case "yesterday":
        newFromDate = new Date(today);
        newFromDate.setDate(today.getDate() - 1);
        newToDate = new Date(newFromDate);
        break;

      case "last_7":
        newToDate = new Date(today);
        newFromDate = new Date(today);
        newFromDate.setDate(today.getDate() - 6);
        break;

      case "last_30":
        newToDate = new Date(today);
        newFromDate = new Date(today);
        newFromDate.setDate(today.getDate() - 29);
        break;

      case "this_week": {
        const day = today.getDay();
        const diff = day === 0 ? 6 : day - 1;
        newFromDate = new Date(today);
        newFromDate.setDate(today.getDate() - diff);
        newToDate = new Date(today);
        break;
      }

      case "this_month":
        newFromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        newToDate = new Date(today);
        break;

      default:
        return;
    }

    const formattedFromDate = formatDate(newFromDate);
    const formattedToDate = formatDate(newToDate);

    console.log(`📅 Date range preset: ${range}`, {
      from: formattedFromDate,
      to: formattedToDate,
    });

    setFromDate(formattedFromDate);
    setToDate(formattedToDate);

    notify({
      fromDate: formattedFromDate,
      toDate: formattedToDate,
      dateRange: range,
    });
  };

  // Build country options dynamically
  const countryOptions: Option[] = countries
    .filter(c => c !== 'All')
    .map(c => ({
      value: c.toLowerCase().replace(/\s+/g, '_'),
      label: c,
      icon: getCountryFlag(c),
    }));

  // Build platform options dynamically
  const platformOptions: Option[] = platforms
    .filter(p => p !== 'All')
    .map(p => ({
      value: p.toLowerCase(),
      label: p,
      icon: getPlatformIcon(p),
    }));

  // Create all filter components with their indices for consistent staggering
  const allFilterComponents = [
    // Sentiment filter
    (idx: number) => (
      <MultiSelect
        key="sentiment"
        id="sentiment"
        label="Sentiment"
        labelIcon={<i className="fas fa-smile" />}
        allLabel="All Sentiments"
        allIcon={<i className="fas fa-layer-group" style={{ color: '#7B61FF' }} />}
        options={SENTIMENT_OPTIONS}
        selected={sentiments}
        onChange={v => { setSentiments(v); notify({ sentiments: v }); }}
        index={idx}
      />
    ),
    // Country filter
    (idx: number) => (
      <MultiSelect
        key="country"
        id="country"
        label="Country"
        labelIcon={<i className="fas fa-globe" />}
        allLabel="All Countries"
        options={countryOptions}
        selected={selCountries}
        onChange={v => { setSelCountries(v); notify({ countries: v }); }}
        index={idx}
      />
    ),
    // Platform filter
    (idx: number) => (
      <MultiSelect
        key="platform"
        id="platform"
        label="Platform"
        labelIcon={<i className="fas fa-mobile-alt" />}
        allLabel="All Platforms"
        allIcon={<i className="fas fa-th" style={{ color: '#7B61FF' }} />}
        options={platformOptions}
        selected={selPlatforms}
        onChange={v => { setSelPlatforms(v); notify({ platforms: v }); }}
        index={idx}
      />
    ),
    // Date Range Select
    (idx: number) => (
      <motion.div
        key="date-range"
        className="filter-group"
        custom={idx}
        initial="hidden"
        animate="visible"
        variants={filterGroupVariants}
        whileHover="hover"
      >
        <label className="filter-label">
          <motion.span
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 + 0.1 }}
          >
            <i className="fas fa-calendar-week" />&nbsp;Date Range
          </motion.span>
        </label>
        <motion.select
          id="id_range_preset"
          name="range_preset"
          className="filter-select"
          value={dateRange}
          onChange={handleDateRangeChange}
          variants={controlVariants}
          initial="hidden"
          animate="visible"
          whileTap="tap"
          transition={{ delay: idx * 0.05 + 0.15 }}
        >
          {DATE_RANGE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </motion.select>
      </motion.div>
    ),
    // From Date Input
    (idx: number) => (
      <motion.div
        key="from-date"
        className="filter-group"
        custom={idx}
        initial="hidden"
        animate="visible"
        variants={filterGroupVariants}
        whileHover="hover"
      >
        <label className="filter-label">
          <motion.span
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 + 0.1 }}
          >
            <i className="fas fa-calendar-alt" />&nbsp;From
          </motion.span>
        </label>
        <motion.input
          ref={fromDateRef}
          type="date"
          name="from_date"
          className="filter-select"
          value={fromDate}
          max={toDate}
          onChange={handleFromDateChange}
          onKeyDown={handleKeyDown}
          variants={controlVariants}
          initial="hidden"
          animate="visible"
          whileTap="tap"
          transition={{ delay: idx * 0.05 + 0.15 }}
        />
      </motion.div>
    ),
    // To Date Input
    (idx: number) => (
      <motion.div
        key="to-date"
        className="filter-group"
        custom={idx}
        initial="hidden"
        animate="visible"
        variants={filterGroupVariants}
        whileHover="hover"
      >
        <label className="filter-label">
          <motion.span
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 + 0.1 }}
          >
            <i className="fas fa-calendar-alt" />&nbsp;To
          </motion.span>
        </label>
        <motion.input
          ref={toDateRef}
          type="date"
          name="to_date"
          className="filter-select"
          value={toDate}
          min={fromDate}
          onChange={handleToDateChange}
          onKeyDown={handleKeyDown}
          variants={controlVariants}
          initial="hidden"
          animate="visible"
          whileTap="tap"
          transition={{ delay: idx * 0.05 + 0.15 }}
        />
      </motion.div>
    ),
  ];

  return (
    <div className="analytics-header">
      <div className="container-fluid px-4">
        <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3">

          {/* Title */}
          <motion.h1
            className="sh-page-title h4 "
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {title}
          </motion.h1>

          {/* Filters - All components now share the same index sequence */}
          <div className="d-flex flex-column flex-md-row flex-lg-row align-items-start align-items-lg-center gap-3 flex-wrap">
            {allFilterComponents.map((component, idx) => component(idx))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubHeader;