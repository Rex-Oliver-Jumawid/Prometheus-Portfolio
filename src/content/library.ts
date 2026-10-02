export type LibraryBook = {
  id: "furniture-odyssey";
  title: string;
  category: string;
  modelUrl: string;
  anchor: string;
  root: string;
  fit?: {
    targetHeight: number;
    yawDegrees: number;
  };
};

const SOURCE_REVISION = "80ab4f3f46c25957eb3a439158d9d5468b717f67";
const SOURCE_ROOT =
  "https://raw.githubusercontent.com/PaulEscobia13/prometheus-library-prototype/" +
  SOURCE_REVISION +
  "/public/library";

export const prometheusLibrary = {
  title: "The Prometheus Library",
  eyebrow: "Selected work",
  environmentUrl: `${SOURCE_ROOT}/library-environment.glb`,
  sourceRevision: SOURCE_REVISION,
  books: [
    {
      id: "furniture-odyssey",
      title: "Furniture Odyssey",
      category: "Case study",
      modelUrl: "/models/projects/furniture-odyssey/book.glb",
      anchor: "Anchor_Project_Furniture",
      root: "FO_Book_ROOT",
      fit: {
        targetHeight: 1.346,
        yawDegrees: -90,
      },
    },
  ] satisfies readonly LibraryBook[],
} as const;
