import React from "react";
import "./CompetitorCard..css"

interface CompetitorCardProps {
  name: string;
  type: string;
  country?: string;
  image?: string;
}

/* 🔹 Helper function to get country code for flag */
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
    "Finland": "fi",
    "Belgium": "be",
    "Switzerland": "ch",
    "Austria": "at",
    "Ireland": "ie",
    "Poland": "pl",
    "Portugal": "pt",
    "Greece": "gr",
    "Czech Republic": "cz",
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
    "New Zealand": "nz",
    "South Africa": "za",
    "Brazil": "br",
    "Mexico": "mx",
    "Japan": "jp",
    "South Korea": "kr",
    "Singapore": "sg",
    "Malaysia": "my",
    "Thailand": "th",
    "Vietnam": "vn",
    "Indonesia": "id",
    "Philippines": "ph",
    "Turkey": "tr",
    "UAE": "ae",
    "Saudi Arabia": "sa",
    "Israel": "il",
    "Egypt": "eg",
    "Nigeria": "ng",
    "Kenya": "ke",
    "Argentina": "ar",
    "Chile": "cl",
    "Colombia": "co",
    "Peru": "pe",
    "Venezuela": "ve"
  };
  return map[country] || "un"; // Return "un" for unknown countries
};

const CompetitorCard: React.FC<CompetitorCardProps> = ({
  name,
  type,
  country,
  image,
}) => {
  return (
    <div className="competitor-card">
      
      {/* 🔹 Logo */}
      <div className="competitor-logo">
        {image ? (
          <img src={image} alt={name} />
        ) : (
          <div className="logo-placeholder">
            {name.charAt(0)}
          </div>
        )}
      </div>

      {/* 🔹 Name */}
      <div className="competitor-name">{name}</div>

      {/* 🔹 Type */}
      <div className={`competitor-type ${type.toLowerCase()}`}>
        {type.toUpperCase()}
      </div>

      {/* 🔹 Country with Flag */}
      {country && (
        <div className="competitor-country">
          <img
            src={`https://flagcdn.com/w20/${getCountryCode(country)}.png`}
            alt={`Flag of ${country}`}
            width="20"
            height="15"
            style={{ objectFit: "cover" }}
          />
          <span>{country}</span>
        </div>
      )}
    </div>
  );
};

export default CompetitorCard;