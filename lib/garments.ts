export const CATEGORIES = ["Formal", "Coats", "Jackets", "Tops"] as const;
export type GarmentCategory = (typeof CATEGORIES)[number];

export interface Garment {
  id: string;
  name: string;
  /** Short label shown on the card. */
  type: string;
  /** Filter group in the garment rack. */
  category: GarmentCategory;
  /** Path under /public. Sources and licenses: public/garments/CREDITS.md. */
  image: string;
  /**
   * Prompt sent to the try-on model along with the image. Decart's guidance:
   * "Substitute the current top with ..." to replace clothing, "Add ... to the
   * person's head" for hats; include colour, material, pattern and fit.
   */
  prompt: string;
}

export const GARMENTS: Garment[] = [
  {
    id: "suit-glen",
    name: "Glen Check Suit",
    type: "Double-breasted suit",
    category: "Formal",
    image: "/garments/suit-glen.jpg",
    prompt:
      "Substitute the current top with a light grey glen check double-breasted wool suit jacket with peak lapels and a white pocket square, worn over a light striped dress shirt and a dark patterned tie, tailored fit.",
  },
  {
    id: "suit-tweed",
    name: "Harris Tweed Suit",
    type: "Three-piece suit",
    category: "Formal",
    image: "/garments/suit-tweed.jpg",
    prompt:
      "Substitute the current top with a mustard-olive windowpane Harris tweed suit jacket and matching waistcoat with notch lapels, worn over a cream shirt and a dark green knit tie, classic fit.",
  },
  {
    id: "tuxedo",
    name: "Black Tuxedo",
    type: "Tuxedo",
    category: "Formal",
    image: "/garments/tuxedo.jpg",
    prompt:
      "Substitute the current top with a black tuxedo jacket with satin peak lapels, worn over a crisp white pleated dress shirt and a black silk bow tie, slim tailored fit.",
  },
  {
    id: "overcoat",
    name: "Navy Overcoat",
    type: "Overcoat",
    category: "Coats",
    image: "/garments/overcoat.jpg",
    prompt:
      "Substitute the current top with a long navy blue wool overcoat reaching below the knee, with wide notch lapels and a single-breasted concealed button front, structured fit.",
  },
  {
    id: "trench",
    name: "Beige Trench Coat",
    type: "Trench coat",
    category: "Coats",
    image: "/garments/trench.jpg",
    prompt:
      "Substitute the current top with a long beige cotton gabardine trench coat with a pointed collar, a single-breasted button front and slash pockets, buttoned up, relaxed fit.",
  },
  {
    id: "peacoat",
    name: "Navy Pea Coat",
    type: "Pea coat",
    category: "Coats",
    image: "/garments/peacoat.jpg",
    prompt:
      "Substitute the current top with a navy blue heavy wool double-breasted pea coat with a wide spread collar, two rows of large dark buttons and hip length, regular fit.",
  },
  {
    id: "leather",
    name: "Leather Jacket",
    type: "Jacket",
    category: "Jackets",
    image: "/garments/leather.jpg",
    prompt:
      "Substitute the current top with a distressed dark brown leather jacket with a stand collar, a front zip, flap chest pockets and a worn faded patina, fitted.",
  },
  {
    id: "denim",
    name: "Denim Jacket",
    type: "Jacket",
    category: "Jackets",
    image: "/garments/denim.jpg",
    prompt:
      "Substitute the current top with a light blue washed denim trucker jacket with button-flap chest pockets, a point collar, copper buttons and contrast stitching, regular fit.",
  },
  {
    id: "hoodie",
    name: "Navy Hoodie",
    type: "Hoodie",
    category: "Tops",
    image: "/garments/hoodie.jpg",
    prompt:
      "Substitute the current top with a plain navy blue cotton pullover hoodie with a light grey lined hood, grey drawstrings, a front kangaroo pocket and ribbed cuffs, relaxed fit.",
  },
  {
    id: "sweater",
    name: "Grey Wool Sweater",
    type: "Sweater",
    category: "Tops",
    image: "/garments/sweater.jpg",
    prompt:
      "Substitute the current top with a heather grey chunky wool knit sweater with a high crew neck, ribbed cuffs and hem, and a soft textured knit, regular fit.",
  },
  {
    id: "madras",
    name: "Madras Shirt",
    type: "Shirt",
    category: "Tops",
    image: "/garments/madras.jpg",
    prompt:
      "Substitute the current top with a long-sleeve cotton madras shirt in a bright multicolour plaid of blue, pink, green and yellow, with a button-down collar, regular fit.",
  },
  {
    id: "kurta",
    name: "Blue Khadi Kurta",
    type: "Kurta",
    category: "Tops",
    image: "/garments/kurta.jpg",
    prompt:
      "Substitute the current top with a light blue handwoven khadi cotton kurta with a short mandarin collar, a buttoned placket, small woven motifs and knee length, relaxed fit.",
  },
];
