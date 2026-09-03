import apiClient from "./client";

export const fetchCategories = () =>
  apiClient.get("/ecommerce/categories").then((res) => res.data.categories);

export const fetchProducts = (params = {}) =>
  apiClient.get("/ecommerce/products", { params }).then((res) => res.data);

export const fetchProduct = (slug) =>
  apiClient.get(`/ecommerce/products/${slug}`).then((res) => res.data.product);

// Currently-live flash sale (if any) for a placement - "home" (main Home
// Screen) or "ecommerce" (discover page). Never errors on "none live";
// resolves to null instead.
export const fetchActiveFlashSale = (placement) =>
  apiClient
    .get("/ecommerce/flash-sales/active", { params: { placement } })
    .then((res) => res.data.flashSale);

export const fetchShowcaseSlides = () =>
  apiClient.get("/ecommerce/showcase-slides").then((res) => res.data.slides);

export const fetchCart = () =>
  apiClient.get("/ecommerce/cart").then((res) => res.data.items);

export const addToCart = (productId, quantity = 1) =>
  apiClient.post("/ecommerce/cart", { productId, quantity }).then((res) => res.data.item);

export const updateCartItem = (id, quantity) =>
  apiClient.patch(`/ecommerce/cart/${id}`, { quantity }).then((res) => res.data.item);

export const removeCartItem = (id) => apiClient.delete(`/ecommerce/cart/${id}`);

export const fetchOrders = () =>
  apiClient.get("/ecommerce/orders").then((res) => res.data.orders);

export const fetchOrder = (id) =>
  apiClient.get(`/ecommerce/orders/${id}`).then((res) => res.data.order);

export const createOrder = (deliveryAddressId, paymentMethod = "cash") =>
  apiClient.post("/ecommerce/orders", { deliveryAddressId, paymentMethod }).then((res) => res.data);

export const fetchWishlist = () =>
  apiClient.get("/ecommerce/wishlist").then((res) => res.data.items);

export const toggleWishlist = (productId) =>
  apiClient
    .post("/ecommerce/wishlist/toggle", { productId })
    .then((res) => res.data.wishlisted);
