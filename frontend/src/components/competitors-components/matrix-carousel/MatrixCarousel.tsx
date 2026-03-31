import React, { useState, useRef, useEffect } from "react";
import "./MatrixCarousel.css";

interface MatrixSlide {
  tier: string;
  competitor_type?: string;  // "MNO" | "MVNO"
  html: string;
}

interface MatrixCarouselProps {
  slides: MatrixSlide[];
}

const TIER_ICONS: Record<string, string> = {
  Lite: "bi-lightning",
  Standard: "bi-star",
  Plus: "bi-star-fill",
  Premium: "bi-gem",
};

const MatrixCarousel: React.FC<MatrixCarouselProps> = ({ slides }) => {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = slides.length;

  /* ─── Auto-play ─── */
  const startAutoplay = () => {
    stopAutoplay();
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % total);
      setDirection("right");
    }, 8000);
  };

  const stopAutoplay = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (total > 1) startAutoplay();
    return () => stopAutoplay();
  }, [total]);

  /* ─── Navigation ─── */
  const goNext = () => {
    setDirection("right");
    setActive((prev) => (prev + 1) % total);
    startAutoplay();
  };

  const goPrev = () => {
    setDirection("left");
    setActive((prev) => (prev - 1 + total) % total);
    startAutoplay();
  };

  const handleTabClick = (index: number) => {
    if (index === active) return;
    setDirection(index > active ? "right" : "left");
    setActive(index);
    startAutoplay();
  };

  if (total === 0) return null;

  const currentSlide = slides[active];
  const compType = currentSlide.competitor_type?.toUpperCase() || "";

  /* Build tab label: "Lite · MNO" */
  const getTabLabel = (slide: MatrixSlide) => {
    const type = slide.competitor_type?.toUpperCase() || "";
    return type ? `${slide.tier} · ${type}` : slide.tier;
  };

  return (
    <div className="matrix-carousel">

      {/* ─── Header: Tabs + Navigation ─── */}
      <div className="carousel-header">

        {/* Tier Tabs */}
        <div className="carousel-tabs">
          {slides.map((slide, i) => {
            const icon = TIER_ICONS[slide.tier] || "bi-layers";
            const isActive = i === active;
            return (
              <button
                key={`${slide.tier}-${slide.competitor_type}-${i}`}
                className={`carousel-tab ${isActive ? "active" : ""}`}
                onClick={() => handleTabClick(i)}
              >
                <i className={`bi ${icon}`}></i>
                <span>{getTabLabel(slide)}</span>
              </button>
            );
          })}
        </div>

        {/* Prev / Next buttons */}
        {total > 1 && (
          <div className="carousel-nav">
            <button className="carousel-nav-btn" onClick={goPrev} title="Previous">
              <i className="bi bi-chevron-left"></i>
            </button>
            <span className="carousel-counter">{active + 1} / {total}</span>
            <button className="carousel-nav-btn" onClick={goNext} title="Next">
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      {/* ─── Progress Bar ─── */}
      <div className="carousel-progress-track">
        <div
          className="carousel-progress-bar"
          style={{ width: `${((active + 1) / total) * 100}%` }}
        />
      </div>

      {/* ─── Slide Content ─── */}
      <div className="carousel-viewport">
        <div
          key={active}
          className={`carousel-slide carousel-slide-enter-${direction}`}
        >
          {/* Tier + Type badge */}
          <div className="carousel-slide-header">
            <div className="carousel-slide-badge">
              <i className={`bi ${TIER_ICONS[currentSlide.tier] || "bi-layers"}`}></i>
              {currentSlide.tier} Plan
            </div>
            {compType && (
              <span className={`carousel-type-label ${compType.toLowerCase()}`}>
                {compType}
              </span>
            )}
          </div>

          {/* HTML Table content */}
          <div
            className="matrix-html-content"
            dangerouslySetInnerHTML={{ __html: currentSlide.html }}
          />
        </div>
      </div>

      {/* ─── Dot Indicators ─── */}
      {total > 1 && (
        <div className="carousel-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === active ? "active" : ""}`}
              onClick={() => handleTabClick(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MatrixCarousel;
