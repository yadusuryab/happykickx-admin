export type Category = {
  _id: string;
  title: string;
  slug: string;
  img?: string;
  orderNumber: number;
};

export const QUERY = `*[_type == "category"] | order(orderNumber asc, title asc){
  _id,
  title,
  "slug": slug.current,
  "img": image.asset->url,
  orderNumber
}`;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);