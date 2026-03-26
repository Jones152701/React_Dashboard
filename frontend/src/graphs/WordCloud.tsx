import React, { useMemo, useCallback, useRef, useEffect, useState } from "react";
import { Wordcloud } from "@visx/wordcloud";
import { scaleLog } from "@visx/scale";

/* ---------------- Types ---------------- */

interface WordData {
  text: string;
  value: number;
}

type VisxWord = {
  text: string;
  value: number;
};

interface Props {
  data: WordData[];
  maxWords?: number;
  minFontSize?: number;
  maxFontSize?: number;
  padding?: number;
}

/* ---------------- Fixed Layout ---------------- */

const BASE_WIDTH = 700;
const BASE_HEIGHT = 400;

/* ---------------- Colors ---------------- */

const WORD_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#3B82F6",
  "#0EA5E9",
  "#14B8A6",
  // "#10B981",
  // "#F59E0B",
  // "#EF4444",
  // "#EC4899",
  // "#F97316",
];

/* ---------------- Component ---------------- */

const WordCloudVisx: React.FC<Props> = ({
  data,
  maxWords = 80,
  minFontSize = 12,
  maxFontSize = 40,
  padding = 0.5, // tighter packing for horizontal words
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  });

  /* ---------- Responsive container ---------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0) {
          setDimensions({ width: w, height: h });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;

  /* ---------- Prepare words ---------- */
  const words = useMemo<VisxWord[]>(() => {
    return [...data]
      .sort((a, b) => b.value - a.value)
      .slice(0, maxWords)
      .map((d) => ({ text: d.text, value: d.value }));
  }, [data, maxWords]);

  /* ---------- Font scale ---------- */
  const fontScale = useMemo(() => {
    if (words.length === 0) return () => minFontSize;

    const values = words.map((w) => w.value);
    const minVal = Math.min(...values, 1);
    const maxVal = Math.max(...values, 1);

    return scaleLog({
      domain: [minVal, maxVal],
      range: [minFontSize, maxFontSize],
      clamp: true,
    });
  }, [words, minFontSize, maxFontSize]);

  /* ---------- Helpers ---------- */

  const getColor = useCallback((index: number) => {
    return WORD_COLORS[index % WORD_COLORS.length];
  }, []);

  const fontSizeSetter = useCallback(
    (datum: VisxWord) => fontScale(datum.value),
    [fontScale]
  );

  /* ✅ ALL WORDS HORIZONTAL */
  const getRotation = useCallback(() => 0, []);

  /* ---------- Empty state ---------- */
  if (!data || data.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
        }}
      >
        No word cloud data available
      </div>
    );
  }

  /* ---------- Scale + Center ---------- */
  const scaleX = width / BASE_WIDTH;
  const scaleY = height / BASE_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (width - BASE_WIDTH * scale) / 2;
  const offsetY = (height - BASE_HEIGHT * scale) / 2;

  /* ---------- Render ---------- */
  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <svg width={width} height={height}>
        <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
          <Wordcloud<VisxWord>
            words={words}
            width={BASE_WIDTH}
            height={BASE_HEIGHT}
            font={"Inter, Sora, sans-serif"}
            fontSize={fontSizeSetter}
            padding={padding}
            rotate={getRotation} // 🔥 no rotation
            spiral="archimedean"
            random={() => 0.5} // deterministic layout
          >
            {(cloudWords) =>
              cloudWords.map((w, i) => {
                const fontSize = w.size ?? 14;
                const isBig = fontSize > maxFontSize * 0.5;

                return (
                  <text
                    key={`${w.text}-${i}`}
                    textAnchor="middle"
                    transform={`translate(${w.x}, ${w.y})`}
                    fontSize={fontSize}
                    fontFamily="Inter, Sora, sans-serif"
                    fontWeight={
                      isBig
                        ? 700
                        : fontSize > maxFontSize * 0.3
                        ? 600
                        : 400
                    }
                    fill={getColor(i)}
                    style={{
                      cursor: "default",
                      userSelect: "none",
                    }}
                  >
                    {w.text}
                  </text>
                );
              })
            }
          </Wordcloud>
        </g>
      </svg>
    </div>
  );
};

export default WordCloudVisx;