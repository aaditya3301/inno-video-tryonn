export interface Garment {
  id: string;
  name: string;
  /** Short label shown on the card. */
  type: string;
  /** Path under /public. */
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
    id: "hoodie",
    name: "Navy Hoodie",
    type: "Hoodie",
    image: "/garments/hoodie.png",
    prompt:
      "Substitute the current top with a navy blue cotton pullover hoodie with a drawstring hood, a front kangaroo pocket, ribbed cuffs and hem, and a small embroidered light grey cross-shaped logo on the chest, relaxed fit.",
  },
  {
    id: "bomber",
    name: "Black Bomber",
    type: "Jacket",
    image: "/garments/bomber.png",
    prompt:
      "Substitute the current top with a black zip-up bomber jacket with a ribbed collar, cuffs and hem, a zip pocket on the sleeve, and a small bright blue cross-shaped logo on the left chest, regular fit.",
  },
  {
    id: "blazer",
    name: "Navy Blazer",
    type: "Blazer",
    image: "/garments/blazer.png",
    prompt:
      "Substitute the current top with a navy blue single-breasted blazer with notch lapels and button cuffs, worn over a light blue collared shirt and a royal blue tie, with a small white cross-shaped logo on the chest, tailored fit.",
  },
  {
    id: "crewneck",
    name: "Grey Crewneck",
    type: "Sweatshirt",
    image: "/garments/crewneck.png",
    prompt:
      "Substitute the current top with a heather grey crewneck sweatshirt with ribbed collar, cuffs and hem, and a large bright blue cross-shaped logo with the word DECART printed in blue below it across the chest, oversized fit.",
  },
  {
    id: "polo",
    name: "Navy Polo",
    type: "Polo",
    image: "/garments/polo.png",
    prompt:
      "Substitute the current top with a royal navy blue short-sleeve piqué polo shirt with a folded collar, a two-button placket, ribbed sleeve cuffs and a small white cross-shaped logo on the left chest, slim fit.",
  },
  {
    id: "tshirt",
    name: "Classic Tee",
    type: "T-shirt",
    image: "/garments/tshirt.png",
    prompt:
      "Substitute the current top with a deep blue short-sleeve crew-neck cotton t-shirt with a small embroidered light grey cross-shaped logo in the center of the chest, regular fit.",
  },
  {
    id: "cap",
    name: "Black Cap",
    type: "Cap",
    image: "/garments/cap.png",
    prompt:
      "Add a black structured baseball cap with a curved brim and a raised bright blue cross-shaped logo with the word DECART embroidered on the front to the person's head.",
  },
  {
    id: "beanie",
    name: "Navy Beanie",
    type: "Beanie",
    image: "/garments/beanie.png",
    prompt:
      "Add a navy blue ribbed knit beanie with a folded cuff and a small embroidered white cross-shaped logo on the cuff to the person's head.",
  },
];
