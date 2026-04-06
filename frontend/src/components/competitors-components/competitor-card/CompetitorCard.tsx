import React from "react";
import { useNavigate } from "react-router-dom";
import "./CompetitorCard..css";
import CountryFlag from "../country-flag/CountryFlag";

interface CompetitorCardProps {
  name: string;
  type: string;
  country?: string;
  image?: string;
}

const CompetitorCard: React.FC<CompetitorCardProps> = ({
  name,
  type,
  country,
  image,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    const clean = (str: string) =>
      str
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/\s+/g, "-");

    const slug = `${clean(name)}__${clean(type)}__${clean(country || "")}`;

    navigate(`/${slug}`, {
      state: {
        name,
        type,
        country
      }
    });
  };

  return (
    <div className="competitor-card" onClick={handleClick}>

      {/* 🔹 Logo */}
      <div className="competitor-logo">
        {image && !imgError ? (
          <img
            src={image}
            alt={name}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="logo-placeholder">
            {name.charAt(0)}
          </div>
        )}
      </div>

      {/* 🔹 Name */}
      <div className="competitor-name">{name}</div>

      {/* 🔹 Badges container for perfect alignment */}
      <div className="competitor-badges">
        {/* 🔹 Type */}
        <div className={`competitor-type ${type.toLowerCase()}`}>
          {type.toUpperCase()}
        </div>

        {/* 🔹 Country with Flag */}
        {country && (
          <div className="competitor-country">
            <CountryFlag country={country} width={20} height={15} />
            <span>{country}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitorCard;