declare module "d3-cloud" {
  interface Word {
    text: string;
    size: number;
    x?: number;
    y?: number;
    rotate?: number;
  }

  interface Cloud {
    size: (size: [number, number]) => Cloud;
    words: (words: Word[]) => Cloud;
    padding: (padding: number) => Cloud;
    rotate: (fn: () => number) => Cloud;
    font: (font: string) => Cloud;
    fontSize: (fn: (d: Word) => number) => Cloud;
    on: (event: "end", fn: (words: Word[]) => void) => Cloud;
    start: () => void;
    spiral: (type: "archimedean" | "rectangular") => Cloud;
  }

  function cloud(): Cloud;

  export default cloud;
}