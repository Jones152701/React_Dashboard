import React from "react";

/* ================= TYPES ================= */

export interface CardItem {
  title: string;
  value: string | number;
}

/* ================= SINGLE CARD ================= */

interface TitleValueCardProps {
  title: string;
  value: string | number;
}

const TitleValueCard: React.FC<TitleValueCardProps> = ({ title, value }) => {
  return (
    <div className="card shadow-sm h-100">
      <div className="card-body p-4">
        <h6 className="card-title text-muted mb-1">{title}</h6>
        <h4 className="card-text fw-bold">{value}</h4>
      </div>
    </div>
  );
};

/* ================= CARDS GRID ================= */

interface CardsProps {
  data: CardItem[];
}

const Cards: React.FC<CardsProps> = ({ data }) => {
  return (
    <div className="row g-3">
      {data.map((item, index) => (
        <div key={index} className="col-6">
          {/* 👈 THIS MAKES 2 PER ROW */}
          <TitleValueCard title={item.title} value={item.value} />
        </div>
      ))}
    </div>
  );
};

export default Cards;