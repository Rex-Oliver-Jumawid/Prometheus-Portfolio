export type BookPage = {
  label: string;
  title: string;
  paragraphs: readonly string[];
};

export type PortfolioProject = {
  slug: string;
  title: string;
  summary: string;
  modelUrl: string;
  coverUrl: string;
  readerCover: { url: string; width: number; height: number };
  sourceUrl: string;
  pages: readonly BookPage[];
};

// Sample reading copy from the supplied book repository; replace with the final case study.
export const furnitureOdyssey: PortfolioProject = {
  slug: "furniture-odyssey",
  title: "Furniture Odyssey",
  summary:
    "Products, orders, quotations, delivery, and records — brought into one workspace.",
  modelUrl: "/models/projects/furniture-odyssey/book.glb",
  coverUrl: "/models/projects/furniture-odyssey/cover.png",
  readerCover: {
    url: "/models/projects/furniture-odyssey/front-cover.png",
    width: 1054,
    height: 1493,
  },
  sourceUrl: "https://github.com/PaulEscobia13/furniture-odyssey-book",
  pages: [
    {
      label: "The case study",
      title: "Furniture Odyssey",
      paragraphs: [
        "How Prometheus Unified Online Furniture Operations.",
        "Products, orders, quotations, delivery, and records — all in one dashboard.",
      ],
    },
    {
      label: "An interactive preview",
      title: "A connected workspace.",
      paragraphs: [
        "The cover introduces a story about bringing online furniture operations together.",
        "These sample pages explore the themes named on the cover. Drag the book to see its form, then turn the pages to explore.",
      ],
    },
    {
      label: "Products & orders",
      title: "From selection to order.",
      paragraphs: [
        "Start with the furniture: its design, details, and place in a collection.",
        "Then follow the order. A useful workflow connects the chosen product with the customer and the next step.",
      ],
    },
    {
      label: "Quotations & delivery",
      title: "Every step in view.",
      paragraphs: [
        "A quotation brings the proposed purchase into focus. Delivery carries that intention into the customer’s space.",
        "A shared view can make it easier to follow what needs attention along the way.",
      ],
    },
    {
      label: "Records",
      title: "Keep the story together.",
      paragraphs: [
        "Products, orders, quotations, and delivery each leave a record.",
        "Keeping those details connected gives a team a clearer place to start when it needs to find context or follow up.",
      ],
    },
    {
      label: "One dashboard",
      title: "Return to the whole.",
      paragraphs: [
        "Furniture Odyssey presents a simple theme: connected operations, brought into one view.",
        "This is a prototype reading experience. The final case-study text can replace these sample pages.",
      ],
    },
  ],
};
