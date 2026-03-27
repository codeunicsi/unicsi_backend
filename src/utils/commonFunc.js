// 🔁 Mapping Function (IMPORTANT)
export function mapToShopifyProduct(product) {
  return {
    product: {
      title: product.title,
      body_html: product.description,
      vendor: product.brand,
      product_type: product.category?.name || "General",
      status: product.lifecycle_status === "active" ? "active" : "draft",

      options: [
        { name: "Color" },
        { name: "Size" },
        { name: "Material" },
      ],

      variants: product.variants.map((v) => ({
        sku: v.sku,
        price: v.price,
        compare_at_price: v.compare_at_price,
        inventory_management: "shopify",
        inventory_quantity: v.inventory_quantity,
        option1: v.option1,
        option2: v.option2,
        option3: v.option3,
        weight: v.weight_grams || 0,
        weight_unit: "g",
        taxable: true,
      })),

      images: product.images.map((img) => ({
        src: img.image_url.replace("localhost", "yourdomain.com"),
      })),
    },
  };
}