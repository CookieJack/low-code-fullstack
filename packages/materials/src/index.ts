import type { MaterialDef } from "./types";
import { containerDef } from "./blocks/Container";
import { navbarDef } from "./blocks/Navbar";
import { heroDef } from "./blocks/Hero";
import { featuresDef } from "./blocks/Features";
import { imageTextDef } from "./blocks/ImageText";
import { galleryDef } from "./blocks/Gallery";
import { ctaDef } from "./blocks/Cta";
import { richTextDef } from "./blocks/RichText";
import { carouselDef } from "./blocks/carousel-def";
import { videoDef } from "./blocks/Video";
import { pricingDef } from "./blocks/Pricing";
import { faqDef } from "./blocks/Faq";
import { contactFormDef } from "./blocks/contact-form-def";
import { footerDef } from "./blocks/Footer";

export * from "./types";
export { sectionStyle, textColorFor } from "./lib/style";

export const materials: MaterialDef[] = [
  containerDef,
  navbarDef,
  heroDef,
  featuresDef,
  imageTextDef,
  galleryDef,
  richTextDef,
  carouselDef,
  videoDef,
  pricingDef,
  faqDef,
  ctaDef,
  contactFormDef,
  footerDef,
];

export const materialMap: Map<string, MaterialDef> = new Map(
  materials.map((m) => [m.type, m]),
);

export function getMaterial(type: string): MaterialDef | undefined {
  return materialMap.get(type);
}
