import React, { useMemo, useCallback, useRef, useEffect, useState } from "react";
import { Wordcloud } from "@visx/wordcloud";
import { scaleLog } from "@visx/scale";

/* ---------------- Types ---------------- */

export interface DrillEvent {
  type: "bar" | "area" | "pie" | "word" | "treemap";
  key: string;
  value: any;
  data: any;
}

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
  onDrillDown?: (event: DrillEvent) => void;
  selectedValue?: string;
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
];

/* ---------------- Component ---------------- */

const WordCloudVisx: React.FC<Props> = ({
  data,
  maxWords = 80,
  minFontSize = 12,
  maxFontSize = 40,
  padding = 0.5,
  onDrillDown,
  selectedValue,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  });

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

  const words = useMemo<VisxWord[]>(() => {
    return [...data]
      .sort((a, b) => b.value - a.value)
      .slice(0, maxWords)
      .map((d) => ({ text: d.text, value: d.value }));
  }, [data, maxWords]);

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

  const getColor = useCallback((index: number, text: string) => {
    const isSelected = selectedValue !== undefined && text === selectedValue;
    
    if (isSelected) {
      return "#111827";
    }
    
    return WORD_COLORS[index % WORD_COLORS.length];
  }, [selectedValue]);

  const fontSizeSetter = useCallback(
    (datum: VisxWord) => fontScale(datum.value),
    [fontScale]
  );

  const getRotation = useCallback(() => 0, []);

  const handleWordClick = (word: VisxWord) => {
    if (!onDrillDown) return;
    
    onDrillDown({
      type: "word",
      key: "text",
      value: word.text,
      data: word,
    });
  };

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

  const scaleX = width / BASE_WIDTH;
  const scaleY = height / BASE_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (width - BASE_WIDTH * scale) / 2;
  const offsetY = (height - BASE_HEIGHT * scale) / 2;

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
            rotate={getRotation}
            spiral="archimedean"
            random={() => 0.5}
          >
            {(cloudWords) =>
              cloudWords.map((w, i) => {
                const fontSize = w.size ?? 14;
                const isBig = fontSize > maxFontSize * 0.5;
                const isSelected = selectedValue !== undefined && w.text === selectedValue;

                return (
                  <text
                    key={`${w.text}-${i}`}
                    textAnchor="middle"
                    transform={`translate(${w.x}, ${w.y})`}
                    fontSize={fontSize}
                    fontFamily="Inter, Sora, sans-serif"
                    fontWeight={
                      isSelected ? 800 : (isBig ? 700 : fontSize > maxFontSize * 0.3 ? 600 : 400)
                    }
                    fill={getColor(i, w.text)}
                    style={{
                      cursor: onDrillDown ? "pointer" : "default",
                      userSelect: "none",
                      transition: "font-weight 0.2s ease",
                    }}
                    onClick={() => handleWordClick(w)}
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