declare module "plotly.js-dist-min" {
  // The dist-min build re-exports the same surface as the full plotly.js, but
  // its package ships without types. We re-use the @types/plotly.js namespace.
  import type { PlotlyHTMLElement, Data, Layout, Config } from "plotly.js";

  interface PlotlyStatic {
    newPlot(
      root: HTMLElement | string,
      data: Data[],
      layout?: Partial<Layout>,
      config?: Partial<Config>,
    ): Promise<PlotlyHTMLElement>;
    react(
      root: HTMLElement | string,
      data: Data[],
      layout?: Partial<Layout>,
      config?: Partial<Config>,
    ): Promise<PlotlyHTMLElement>;
    purge(root: HTMLElement | string): void;
  }

  const Plotly: PlotlyStatic;
  export default Plotly;
}
