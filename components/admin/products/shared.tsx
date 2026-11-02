export const LABELS: any = [
  ["trending", "Trending"],
  ["new-arrival", "New Arrival"],
  ["best-seller", "Best Seller"],
  ["limited-edition", "Limited Edition"],
  ["sale", "Sale"],
] as const;

export const OFFERS = [
  ["offer1Pair", "1 Pair"],
  ["offer2Pair", "2 Pair"],
  ["offer3Pair", "3 Pair"],
] as const;

export const QUALITIES = [
  ["10a", "10A (Premium)"],
  ["7a", "7A"],
] as const;

export const DISABLE_REASONS = [
  ["out-of-stock", "Out of Stock"],
  ["seasonal", "Seasonal"],
  ["discontinued", "Discontinued"],
  ["quality-issues", "Quality Issues"],
  ["other", "Other"],
] as const;

export const DEFAULT_SIZES = [6, 7, 8, 9, 10];

export interface Shoe {
  _id: string;
  orderNumber: number;
  productName: string;
  price: number;
  isDisabled: boolean;
  img?: string | null; // 160px CDN thumb, resolved in GROQ
  productLabel?: string[];
  sizes?: number[];
  disabledSizes?: number[];
  offer1Pair?: boolean;
  offer2Pair?: boolean;
  offer3Pair?: boolean;
  videoUrl?: string;
  posterUrl?: string;
  quality?: string[];
  description?: string;
  madeIn?: string;
  tags?: string[];
  colorVariants?: string[];
  isOffer?: boolean;
  offerPrice?: number;
  buyOneGetOne?: boolean;
  stock?: number;
  disableReason?: string;
}

// One query. Image URL is resolved server-side, so no client URL building.
export const QUERY = `*[_type == "shoe"] | order(orderNumber asc) {
  _id, orderNumber, productName, price, isDisabled,
  productLabel, sizes, disabledSizes, offer1Pair, offer2Pair, offer3Pair,
  quality, description, madeIn, tags, colorVariants,
  isOffer, offerPrice, buyOneGetOne, stock, disableReason,
  "img": images[0].asset->url + "?w=160&h=160&fit=crop&auto=format",
  "videoUrl": video.asset->url,
  "posterUrl": videoPoster.asset->url
}`;