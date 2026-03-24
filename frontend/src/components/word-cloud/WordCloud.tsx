import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import cloud from "d3-cloud";

/* ---------------- Types ---------------- */

type Word = {
  text: string;
  size: number;
  x?: number;
  y?: number;
  rotate?: number;
};

/* ---------------- Props ---------------- */

interface Props {
  data: { text: string; value: number }[];
}

/* ---------------- Component ---------------- */

const WordCloudSVG: React.FC<Props> = ({ data }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // ✅ CONTAINER SIZE (matches wrapper)
    const width = 800;
    const height = 350;

    // ✅ LOG SCALING WITH SAFE CAP
    const words: Word[] = data
      .slice(0, 100)
      .map(d => ({
        text: d.text,
        // Gentler scaling to prevent overflow
        size: Math.min(42, 12 + Math.log(d.value + 1) * 6.5)
      }));

    console.log(`Processing ${words.length} words`);

    /* ---------- Create Layout with Built-in Margins ---------- */
    // ✅ Shrink drawing area by 40px to prevent edge overflow
    const layout = (cloud() as any)
      .size([width - 40, height - 40]) // 🔥 CRITICAL: margins inside
      .words(words)
      .padding(2) // Slightly more padding for readability
      .rotate(() => (Math.random() > 0.9 ? 90 : 0))
      .font("Sora, sans-serif")
      .fontSize((d: Word) => d.size)
      .spiral("archimedean")
      .on("end", draw);

    layout.start();

    /* ---------- Draw Function ---------- */

    function draw(layoutWords: Word[]) {
      const svg = d3.select(ref.current);

      svg.selectAll("*").remove();

      console.log(`✅ Rendered ${layoutWords.length} words`);

      // ✅ Center in the FULL container (not the reduced drawing area)
      const mainGroup = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      // Add words with safe font size cap
      mainGroup
        .selectAll("text")
        .data(layoutWords)
        .enter()
        .append("text")
        .style("font-size", (d: Word) => `${Math.min(d.size, 42)}px`) // 🔥 Extra safety cap
        .style("font-family", "Sora, sans-serif")
        .style("fill", (_d: Word, i: number) => {
          const colors = [
            "#60a5fa", "#34d399", "#f59e0b", "#a78bfa",
            "#f87171", "#6ee7b7", "#fdba74", "#c084fc",
          ];
          return colors[i % colors.length];
        })
        .style("font-weight", "500")
        .style("opacity", 0.9)
        .attr("text-anchor", "middle")
        .attr("transform", (d: Word) => {
          const rotate = d.rotate || 0;
          return `translate(${d.x},${d.y}) rotate(${rotate})`;
        })
        .text((d: Word) => d.text);
    }

    return () => {
      d3.select(ref.current).selectAll("*").remove();
    };

  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        No word cloud data available
      </div>
    );
  }

  /* ---------- Render with Wrapper ---------- */
  return (
    <div className="wordcloud-wrapper">
      <svg ref={ref} />
    </div>
  );
};

export default WordCloudSVG;