/**
 * Shared utility for country → ISO code mapping and flag rendering.
 * 
 * Two strategies:
 *  1. Explicit map for known names / aliases (e.g. "USA" → "us")
 *  2. Auto‑resolve: lowercase the first 2 chars of the country name
 *     — works for most single-word countries ("Tunisia" → "tn" won't work,
 *       so we keep the map comprehensive).
 */

const COUNTRY_CODE_MAP: Record<string, string> = {
  // ─── Europe ───
  "United Kingdom": "gb",
  "UK": "gb",
  "Great Britain": "gb",
  "England": "gb",
  "Scotland": "gb",
  "Wales": "gb",
  "France": "fr",
  "Germany": "de",
  "Italy": "it",
  "Spain": "es",
  "Portugal": "pt",
  "Netherlands": "nl",
  "Holland": "nl",
  "Belgium": "be",
  "Austria": "at",
  "Switzerland": "ch",
  "Sweden": "se",
  "Norway": "no",
  "Denmark": "dk",
  "Finland": "fi",
  "Ireland": "ie",
  "Poland": "pl",
  "Greece": "gr",
  "Czech Republic": "cz",
  "Czechia": "cz",
  "Hungary": "hu",
  "Romania": "ro",
  "Bulgaria": "bg",
  "Croatia": "hr",
  "Slovakia": "sk",
  "Slovenia": "si",
  "Estonia": "ee",
  "Latvia": "lv",
  "Lithuania": "lt",
  "Luxembourg": "lu",
  "Malta": "mt",
  "Cyprus": "cy",
  "Iceland": "is",
  "Albania": "al",
  "Serbia": "rs",
  "Montenegro": "me",
  "Bosnia": "ba",
  "Bosnia and Herzegovina": "ba",
  "North Macedonia": "mk",
  "Macedonia": "mk",
  "Moldova": "md",
  "Ukraine": "ua",
  "Belarus": "by",
  "Georgia": "ge",
  "Armenia": "am",
  "Azerbaijan": "az",
  "Kosovo": "xk",

  // ─── Americas ───
  "United States": "us",
  "USA": "us",
  "US": "us",
  "Canada": "ca",
  "Mexico": "mx",
  "Brazil": "br",
  "Argentina": "ar",
  "Chile": "cl",
  "Colombia": "co",
  "Peru": "pe",
  "Venezuela": "ve",
  "Ecuador": "ec",
  "Bolivia": "bo",
  "Paraguay": "py",
  "Uruguay": "uy",
  "Cuba": "cu",
  "Dominican Republic": "do",
  "Costa Rica": "cr",
  "Panama": "pa",
  "Guatemala": "gt",
  "Honduras": "hn",
  "El Salvador": "sv",
  "Nicaragua": "ni",
  "Jamaica": "jm",
  "Trinidad and Tobago": "tt",
  "Puerto Rico": "pr",

  // ─── Asia ───
  "India": "in",
  "China": "cn",
  "Japan": "jp",
  "South Korea": "kr",
  "North Korea": "kp",
  "Singapore": "sg",
  "Malaysia": "my",
  "Thailand": "th",
  "Vietnam": "vn",
  "Indonesia": "id",
  "Philippines": "ph",
  "Taiwan": "tw",
  "Hong Kong": "hk",
  "Macau": "mo",
  "Sri Lanka": "lk",
  "Bangladesh": "bd",
  "Pakistan": "pk",
  "Nepal": "np",
  "Myanmar": "mm",
  "Cambodia": "kh",
  "Laos": "la",
  "Mongolia": "mn",
  "Brunei": "bn",
  "Maldives": "mv",

  // ─── Middle East ───
  "Turkey": "tr",
  "Türkiye": "tr",
  "UAE": "ae",
  "United Arab Emirates": "ae",
  "Saudi Arabia": "sa",
  "KSA": "sa",
  "Israel": "il",
  "Qatar": "qa",
  "Kuwait": "kw",
  "Oman": "om",
  "Bahrain": "bh",
  "Jordan": "jo",
  "Lebanon": "lb",
  "Iraq": "iq",
  "Iran": "ir",
  "Syria": "sy",
  "Yemen": "ye",
  "Palestine": "ps",

  // ─── Africa ───
  "Egypt": "eg",
  "Nigeria": "ng",
  "Kenya": "ke",
  "South Africa": "za",
  "Ethiopia": "et",
  "Ghana": "gh",
  "Tanzania": "tz",
  "Morocco": "ma",
  "Algeria": "dz",
  "Tunisia": "tn",
  "Libya": "ly",
  "Sudan": "sd",
  "Uganda": "ug",
  "Cameroon": "cm",
  "Senegal": "sn",
  "Ivory Coast": "ci",
  "Côte d'Ivoire": "ci",
  "Rwanda": "rw",
  "Mozambique": "mz",
  "Angola": "ao",
  "Zimbabwe": "zw",
  "Zambia": "zm",
  "Botswana": "bw",
  "Namibia": "na",
  "Mauritius": "mu",
  "Madagascar": "mg",
  "Democratic Republic of Congo": "cd",
  "Congo": "cg",

  // ─── Oceania ───
  "Australia": "au",
  "New Zealand": "nz",
  "Fiji": "fj",
  "Papua New Guinea": "pg",

  // ─── Central Asia ───
  "Kazakhstan": "kz",
  "Uzbekistan": "uz",
  "Turkmenistan": "tm",
  "Kyrgyzstan": "kg",
  "Tajikistan": "tj",
  "Afghanistan": "af",

  // ─── Russia ───
  "Russia": "ru",
  "Russian Federation": "ru",
};

/**
 * Returns the ISO 3166‑1 alpha‑2 code (lowercase) for a country name.
 * Falls back to null if unknown — caller should show text fallback.
 */
export const getCountryCode = (country: string): string | null => {
  // 1. Direct match
  if (COUNTRY_CODE_MAP[country]) return COUNTRY_CODE_MAP[country];

  // 2. Case-insensitive match
  const lower = country.toLowerCase().trim();
  for (const [key, val] of Object.entries(COUNTRY_CODE_MAP)) {
    if (key.toLowerCase() === lower) return val;
  }

  return null; // unknown → caller will render text fallback
};

/**
 * Returns the flag CDN URL for a country, or null if code is unknown.
 */
export const getFlagUrl = (country: string, width: number = 40): string | null => {
  const code = getCountryCode(country);
  if (!code) return null;
  return `https://flagcdn.com/w${width}/${code}.png`;
};

/**
 * Returns 2‑letter emoji‑style initials for text fallback.
 */
export const getCountryInitials = (country: string): string => {
  return country.slice(0, 2).toUpperCase();
};
