export const CATEGORIES = ["Formal", "Coats", "Jackets", "Tops", "Ethnic"] as const;
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

const ITEMS: Garment[] = [
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
    category: "Ethnic",
    image: "/garments/kurta.jpg",
    prompt:
      "Substitute the current top with a light blue handwoven khadi cotton kurta with a short mandarin collar, a buttoned placket, small woven motifs and knee length, relaxed fit.",
  },
  {
    id: "bomber-green",
    name: "Teal Bomber",
    type: "Bomber jacket",
    category: "Jackets",
    image: "/garments/bomber-green.jpg",
    prompt:
      "Substitute the current top with a deep teal green lightweight bomber jacket with a ribbed stand collar, a brass front zipper, slanted hand pockets, a zip pocket on the sleeve and ribbed cuffs and hem, relaxed boxy fit.",
  },
  {
    id: "windbreaker-purple",
    name: "Purple Windbreaker",
    type: "Windbreaker",
    category: "Jackets",
    image: "/garments/windbreaker-purple.jpg",
    prompt:
      "Substitute the current top with a deep purple lightweight windbreaker with a bright blue fleece-lined stand collar, a full-length blue zipper, a chest zip pocket, two hand pockets and elasticated cuffs and hem, regular fit.",
  },
  {
    id: "blazer-grey",
    name: "Grey Blazer",
    type: "Blazer",
    category: "Formal",
    image: "/garments/blazer-grey.jpg",
    prompt:
      "Substitute the current top with a warm grey unstructured washed cotton-linen blazer with notch lapels, a patch chest pocket, two patch hip pockets and a two-button front, soft worn-in texture, slim fit.",
  },
  {
    id: "parka-orange",
    name: "Rust Parka",
    type: "Hooded parka",
    category: "Coats",
    image: "/garments/parka-orange.jpg",
    prompt:
      "Substitute the current top with a rust orange hooded parka in a smooth lightweight shell fabric with a concealed zip front, a drawstring waist, two angled flap pockets and a drawcord hood and hem, loose oversized fit.",
  },
  {
    id: "sweater-nordic",
    name: "Nordic Sweater",
    type: "Knit sweater",
    category: "Tops",
    image: "/garments/sweater-nordic.jpg",
    prompt:
      "Substitute the current top with a navy knit Nordic-pattern pullover sweater with a cream, red and blue snowflake yoke, a quarter-zip stand collar and striped ribbed cuffs and hem, relaxed fit.",
  },
  {
    id: "cardigan-brown",
    name: "Brown Cardigan",
    type: "Cardigan",
    category: "Tops",
    image: "/garments/cardigan-brown.jpg",
    prompt:
      "Substitute the current top with a brown marl wool knit cardigan with a deep V-neck, a full button front with brown buttons, four pleated flap pockets, ribbed cuffs and a straight hip-length body, roomy fit.",
  },
  {
    id: "flannel-olive",
    name: "Olive Flannel Shirt",
    type: "Flannel shirt",
    category: "Tops",
    image: "/garments/flannel-olive.jpg",
    prompt:
      "Substitute the current top with an olive drab wool flannel button-up shirt with a pointed collar, two buttoned chest flap pockets, a full front placket, button cuffs and a curved shirttail hem, straight classic fit.",
  },
  {
    id: "shirt-striped",
    name: "Striped Shirt",
    type: "Casual shirt",
    category: "Tops",
    image: "/garments/shirt-striped.jpg",
    prompt:
      "Substitute the current top with a long-sleeved cotton button-down shirt in bold horizontal blue stripes with yellow, green and pink bands, a button-down collar, one chest pocket and buttoned cuffs, relaxed casual fit.",
  },
  {
    id: "waistcoat-nehru",
    name: "Black Nehru Waistcoat",
    type: "Waistcoat",
    category: "Ethnic",
    image: "/garments/waistcoat-nehru.jpg",
    prompt:
      "Substitute the current top with a black wool Nehru-style waistcoat with a mandarin stand collar, a five-button front with silver crest buttons, a welt chest pocket and two welt hip pockets, worn over a plain white long-sleeve shirt, tailored slim fit.",
  },
  {
    id: "kurta-gold",
    name: "Gold Brocade Kurta",
    type: "Kurta",
    category: "Ethnic",
    image: "/garments/kurta-gold.jpg",
    prompt:
      "Substitute the current top with a knee-length golden-tan jacquard cotton-blend kurta with a mandarin collar, an embroidered and beaded placket with gold buttons, a swirling paisley woven pattern, long sleeves and side slits, straight fit.",
  },
];

/** Grouped by category in the order of CATEGORIES, keeping the order above within each group. */
export const GARMENTS: Garment[] = [...ITEMS].sort(
  (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category),
);
