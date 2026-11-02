import { type SchemaTypeDefinition } from 'sanity'

const category = {
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    { name: "title", title: "Title", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "slug", title: "Slug", type: "slug", options: { source: "title", maxLength: 96 }, validation: (Rule: any) => Rule.required() },
    { name: "image", title: "Image", type: "image" },
    { name: "orderNumber", title: "Display Order", type: "number", validation: (Rule: any) => Rule.integer().min(0) },
  ],
  orderings: [
    { title: "Order, Asc", name: "orderAsc", by: [{ field: "orderNumber", direction: "asc" }] },
  ],
}

const brand = {
  name: "brand",
  title: "Brand",
  type: "document",
  fields: [
    { name: "title", title: "Brand Name", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "slug", title: "Slug", type: "slug", options: { source: "title", maxLength: 96 }, validation: (Rule: any) => Rule.required() },
    { name: "logo", title: "Logo", type: "image" },
    { name: "orderNumber", title: "Display Order", type: "number", validation: (Rule: any) => Rule.integer().min(0) },
  ],
  orderings: [
    { title: "Order, Asc", name: "orderAsc", by: [{ field: "orderNumber", direction: "asc" }] },
  ],
}

const sizes = [6, 7, 8, 9, 10];

const shoe = {
  name: "shoe",
  title: "Shoes",
  type: "document",
  fieldsets: [{ name: "more", title: "More details (optional)", options: { collapsible: true, collapsed: true } }],
  fields: [
    // Core
    { name: "orderNumber", title: "Order Number", type: "number", validation: (Rule: any) => Rule.required().integer().min(0) },
    { name: "productName", title: "Shoe Name", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "images", title: "Images", type: "array", of: [{ type: "image" }], options: { layout: "grid" } },
    { name: "price", title: "Price (1 pair)", type: "number", validation: (Rule: any) => Rule.required().min(0) },
    { name: "offer2Pair", title: "Include in 2 pair offer", type: "boolean", initialValue: false },
    { name: "brand", title: "Brand", type: "reference", to: [{ type: "brand" }] },
    { name: "category", title: "Category", type: "reference", to: [{ type: "category" }] },
    { name: "sizes", title: "Sizes", type: "array", of: [{ type: "number" }], options: { list: sizes }, initialValue: sizes },
    { name: "disabledSizes", title: "Disabled Sizes", type: "array", of: [{ type: "number" }], options: { list: sizes }, initialValue: [] },
    {
      name: "productLabel",
      title: "Label",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Trending", value: "trending" },
          { title: "New Arrival", value: "new-arrival" },
          { title: "Best Seller", value: "best-seller" },
          { title: "Limited Edition", value: "limited-edition" },
          { title: "Sale", value: "sale" },
        ],
      },
    },
    { name: "isDisabled", title: "Hide from website", type: "boolean", initialValue: false },
    {
      name: "disableReason",
      title: "Reason",
      type: "string",
      hidden: ({ document }: any) => !document?.isDisabled,
      options: {
        list: [
          { title: "Out of Stock", value: "out-of-stock" },
          { title: "Seasonal", value: "seasonal" },
          { title: "Discontinued", value: "discontinued" },
          { title: "Quality Issues", value: "quality-issues" },
          { title: "Other", value: "other" },
        ],
      },
    },

    // Rarely needed
    { name: "description", title: "Description", type: "text", fieldset: "more" },
    { name: "madeIn", title: "Country of Origin", type: "string", fieldset: "more" },
    { name: "stock", title: "Stock", type: "number", fieldset: "more" },
    {
      name: "quality",
      title: "Qualities",
      type: "array",
      of: [{ type: "string" }],
      options: { list: [{ title: "10A (Premium)", value: "10a" }, { title: "7A", value: "7a" }] },
      initialValue: ["10a"],
      fieldset: "more",
    },
    { name: "colorVariants", title: "Colors", type: "array", of: [{ type: "string" }], options: { layout: "tags" }, fieldset: "more" },
    { name: "tags", title: "Tags", type: "array", of: [{ type: "string" }], options: { layout: "tags" }, fieldset: "more" },
    { name: "video", title: "Video", type: "file", fieldset: "more" },
    { name: "videoPoster", title: "Video Poster", type: "image", fieldset: "more" },
  ],
  orderings: [
    { title: "Order Number, Asc", name: "orderNumberAsc", by: [{ field: "orderNumber", direction: "asc" }] },
    { title: "Hidden First", name: "disabledFirst", by: [{ field: "isDisabled", direction: "desc" }, { field: "orderNumber", direction: "asc" }] },
  ],
  preview: { select: { title: "productName", subtitle: "brand.title", media: "images.0" } },
}

export default shoe

const review = {
  name: "review",
  title: "Reviews",
  type: "document",
  fields: [
    { name: "customerName", title: "Customer Name", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "shoe", title: "Shoe", type: "reference", to: [{ type: "shoe" }] },
    { name: "rating", title: "Rating", type: "number", options: { list: [1, 2, 3, 4, 5] }, validation: (Rule: any) => Rule.required().min(1).max(5) },
    { name: "reviewText", title: "Review Text", type: "text" },
    { name: "reviewImages", title: "Review Images", type: "array", of: [{ type: "image" }] },
    { name: "isVerifiedPurchase", title: "Verified Purchase?", type: "boolean", initialValue: false },
    { name: "isApproved", title: "Approved for Display?", type: "boolean", initialValue: false },
    { name: "createdAt", title: "Date", type: "datetime", initialValue: () => new Date().toISOString() },
  ],
  orderings: [
    { title: "Newest First", name: "createdAtDesc", by: [{ field: "createdAt", direction: "desc" }] },
  ],
}

const banner = {
  name: "banner",
  title: "Banner",
  type: "document",
  fields: [
    { name: "title", title: "Title", type: "string" },
    { name: "subtitle", title: "Subtitle", type: "string" },
    { name: "image", title: "Banner Image", type: "image" },
    { name: "mobileImage", title: "Mobile Banner Image", type: "image" },
    { name: "link", title: "Redirect Link", type: "string" },
    { name: "orderNumber", title: "Display Order", type: "number", validation: (Rule: any) => Rule.required().integer().min(0) },
    { name: "isActive", title: "Active?", type: "boolean", initialValue: true },
  ],
  orderings: [
    { title: "Order Number, Asc", name: "orderNumberAsc", by: [{ field: "orderNumber", direction: "asc" }] },
  ],
}

const settings = {
  name: "settings",
  title: "Site Settings",
  type: "document",
  fields: [
    { name: "title", title: "Settings Label", type: "string", initialValue: "Global Settings", readOnly: true },
    { name: "freeSocksOffer", title: "Free Socks Offer", type: "boolean", initialValue: false, description: "Enable/disable free socks offer site-wide" },
    { name: "shoeCleanerAddon", title: "Shoe Cleaner Addon", type: "boolean", initialValue: false, description: "Enable/disable shoe cleaner addon site-wide" },
  ],
}

const orderItem = {
  name: "orderItem",
  title: "Order Item",
  type: "object",
  fields: [
    { name: "product", title: "Product", type: "reference", to: [{ type: "shoe" }] },
    { name: "productName", title: "Product Name", type: "string" },
    { name: "imageUrl", title: "Product Image", type: "image" },
    { name: "size", title: "Size", type: "number" },
    { name: "quality", title: "Quality", type: "string", options: { list: [{ title: "10A (Premium)", value: "10a" }, { title: "7A", value: "7a" }] } },
    { name: "price", title: "Price", type: "number" },
    { name: "isFreeItem", title: "Free Item (BOGO)?", type: "boolean", initialValue: false },
  ],
}

const order = {
  name: "order",
  title: "Orders",
  type: "document",
  fields: [
    { name: "orderId", title: "Order ID", type: "string", description: "Internal receipt / order reference", validation: (Rule: any) => Rule.required() },
    { name: "items", title: "Items", type: "array", of: [{ type: "orderItem" }] },
    { name: "customerName", title: "Customer Name", type: "string" },
    { name: "instagramId", title: "Instagram ID", type: "string" },
    { name: "contact1", title: "Contact No. 1", type: "string" },
    { name: "contact2", title: "Contact No. 2", type: "string" },
    { name: "address", title: "Address", type: "text" },
    { name: "district", title: "District", type: "string" },
    { name: "state", title: "State", type: "string" },
    { name: "pincode", title: "Pincode", type: "string" },
    { name: "landmark", title: "Landmark", type: "string" },
    {
      name: "shippingMethod",
      title: "Shipping Method",
      type: "string",
      options: { list: [{ title: "Online (Prepaid)", value: "online" }, { title: "Cash on Delivery", value: "cod" }] },
    },
    { name: "shoeCleanerAddon", title: "Shoe Cleaner Addon", type: "boolean", initialValue: false },
    { name: "freeSocksOffer", title: "Free Socks Offer Applied", type: "boolean", initialValue: false },
    { name: "subtotal", title: "Subtotal", type: "number" },
    { name: "shippingCharge", title: "Shipping Charge", type: "number" },
    { name: "totalAmount", title: "Total Amount", type: "number" },
    { name: "expectedDeliveryLabel", title: "Expected Delivery", type: "string" },
    { name: "razorpayOrderId", title: "Razorpay Order ID", type: "string" },
    { name: "razorpayPaymentId", title: "Razorpay Payment ID", type: "string" },
    {
      name: "paymentStatus",
      title: "Payment Status",
      type: "string",
      options: { list: [{ title: "Paid", value: "paid" }, { title: "Pending", value: "pending" }, { title: "Failed", value: "failed" }, { title: "Refunded", value: "refunded" }] },
      initialValue: "paid",
    },
    {
      name: "fulfillmentStatus",
      title: "Fulfillment Status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Processing", value: "processing" },
          { title: "Shipped", value: "shipped" },
          { title: "Delivered", value: "delivered" },
          { title: "Cancelled", value: "cancelled" },
        ],
      },
      initialValue: "pending",
    },
    { name: "createdAt", title: "Order Date", type: "datetime", initialValue: () => new Date().toISOString() },
  ],
  orderings: [
    { title: "Newest First", name: "createdAtDesc", by: [{ field: "createdAt", direction: "desc" }] },
  ],
  preview: {
    select: { title: "orderId", subtitle: "customerName", amount: "totalAmount" },
    prepare({ title, subtitle, amount }: any) {
      return { title: `Order ${title}`, subtitle: `${subtitle} • ₹${amount}` }
    },
  },
}

export const schemaTypes: SchemaTypeDefinition[] = [shoe, category, brand, review, banner, settings, orderItem, order]

export const schema: { types: SchemaTypeDefinition[] } = {
  types: schemaTypes,
}