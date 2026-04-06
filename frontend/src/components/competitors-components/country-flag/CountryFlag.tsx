import React, { useState } from "react";
import { getFlagUrl, getCountryInitials } from "../../../types/countryFlags";
import "./CountryFlag.css";

interface CountryFlagProps {
  country: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Renders a country flag image with automatic fallback to styled initials
 * if the flag image fails to load or the country is unknown.
 */
const CountryFlag: React.FC<CountryFlagProps> = ({
  country,
  width = 20,
  height = 15,
  className = "",
}) => {
  const [imgError, setImgError] = useState(false);
  const flagUrl = getFlagUrl(country, width * 2); // 2x for retina

  if (!flagUrl || imgError) {
    return (
      <span
        className={`country-flag-fallback ${className}`}
        style={{ width, height, fontSize: Math.max(8, height * 0.55) }}
        title={country}
      >
        {getCountryInitials(country)}
      </span>
    );
  }

  return (
    <img
      src={flagUrl}
      alt={country}
      width={width}
      height={height}
      className={`country-flag-img ${className}`}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
};

export default CountryFlag;
