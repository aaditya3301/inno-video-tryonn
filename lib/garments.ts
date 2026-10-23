export interface Garment {
  id: string;
  name: string;
  /** Short label shown on the card. */
  type: string;
  /** Path under /public. Sources and licenses: public/garments/CREDITS.md. */
  image: string;
  /**
   * Edit instruction sent to Lucy 2.5 along with the reference image. Say what
   * to replace ("Dress the person in…" for full outfits, "Replace the person's
   * top with…" for single pieces) and give colour, material, details and fit.
   */
  prompt: string;
}

export const GARMENTS: Garment[] = [
  {
    id: "suit-glen",
    name: "Glen Check Suit",
    type: "Double-breasted suit",
    image: "/garments/suit-glen.jpg",
    prompt:
      "Dress the person in a light grey glen check double-breasted wool suit with peak lapels, a white pocket square, a light striped dress shirt and a dark patterned tie, tailored fit.",
  },
  {
    id: "suit-tweed",
    name: "Harris Tweed Suit",
    type: "Three-piece suit",
    image: "/garments/suit-tweed.jpg",
    prompt:
      "Dress the person in a mustard-olive windowpane Harris tweed three-piece suit with a matching waistcoat, notch lapels, a cream shirt and a dark green knit tie, classic fit.",
  },
  {
    id: "tuxedo",
    name: "Black Tuxedo",
    type: "Tuxedo",
    image: "/garments/tuxedo.jpg",
    prompt:
      "Dress the person in a black tuxedo with satin peak lapels, a crisp white pleated dress shirt and a black silk bow tie, slim tailored fit.",
  },
  {
    id: "overcoat",
    name: "Navy Overcoat",
    type: "Overcoat",
    image: "/garments/overcoat.jpg",
    prompt:
      "Dress the person in a long navy blue wool overcoat reaching below the knee, with wide notch lapels and a single-breasted concealed button front, worn over a dark suit, structured fit.",
  },
  {
    id: "trench",
    name: "Beige Trench Coat",
    type: "Trench coat",
    image: "/garments/trench.jpg",
    prompt:
      "Dress the person in a long beige cotton gabardine trench coat with a pointed collar, a single-breasted button front and slash pockets, buttoned up, relaxed fit.",
  },
  {
    id: "peacoat",
    name: "Navy Pea Coat",
    type: "Pea coat",
    image: "/garments/peacoat.jpg",
    prompt:
      "Replace the person's top with a navy blue heavy wool double-breasted pea coat with a wide spread collar, two rows of large dark buttons and hip length, regular fit.",
  },
  {
    id: "leather",
    name: "Leather Jacket",
    type: "Jacket",
    image: "/garments/leather.jpg",
    prompt:
      "Replace the person's top with a distressed dark brown leather jacket with a stand collar, a front zip, flap chest pockets and worn faded patina, fitted.",
  },
  {
    id: "denim",
    name: "Denim Jacket",
    type: "Jacket",
    image: "/garments/denim.jpg",
    prompt:
      "Replace the person's top with a light blue washed denim trucker jacket with button-flap chest pockets, a point collar, copper buttons and contrast stitching, regular fit.",
  },
  {
    id: "hoodie",
    name: "Navy Hoodie",
    type: "Hoodie",
    image: "/garments/hoodie.jpg",
    prompt:
      "Replace the person's top with a plain navy blue cotton pullover hoodie with a light grey lined hood, grey drawstrings, a front kangaroo pocket and ribbed cuffs, relaxed fit.",
  },
  {
    id: "sweater",
    name: "Grey Wool Sweater",
    type: "Sweater",
    image: "/garments/sweater.jpg",
    prompt:
      "Replace the person's top with a heather grey chunky wool knit sweater with a high crew neck, ribbed cuffs and hem, and a soft textured knit, regular fit.",
  },
  {
    id: "madras",
    name: "Madras Shirt",
    type: "Shirt",
    image: "/garments/madras.jpg",
    prompt:
      "Replace the person's top with a long-sleeve cotton madras shirt in a bright multicolour plaid of blue, pink, green and yellow, with a button-down collar, regular fit.",
  },
  {
    id: "kurta",
    name: "Blue Khadi Kurta",
    type: "Kurta",
    image: "/garments/kurta.jpg",
    prompt:
      "Replace the person's top with a light blue handwoven khadi cotton kurta with a short mandarin collar, a buttoned placket, small woven motifs and knee length, relaxed fit.",
  },
];
