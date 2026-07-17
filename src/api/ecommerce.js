import apiClient from "./client";

export const fetchCategories = () =>
  apiClient.get("/ecommerce/categories").then((res) => res.data.categories);

export const fetchProducts = (params = {}) =>
  apiClient.get("/ecommerce/products", { params }).then((res) => res.data);

export const fetchProduct = (slug) =>
  apiClient.get(`/ecommerce/products/${slug}`).then((res) => res.data.product);

export const fetchCart = () =>
  apiClient.get("/ecommerce/cart").then((res) => res.data.items);

export const addToCart = (productId, quantity = 1) =>
  apiClient.post("/ecommerce/cart", { productId, quantity }).then((res) => res.data.item);

export const updateCartItem = (id, quantity) =>
  apiClient.patch(`/ecommerce/cart/${id}`, { quantity }).then((res) => res.data.item);

export const removeCartItem = (id) => apiClient.delete(`/ecommerce/cart/${id}`);

export const fetchOrders = () =>
  apiClient.get("/ecommerce/orders").then((res) => res.data.orders);

export const createOrder = (deliveryAddressId) =>
  apiClient.post("/ecommerce/orders", { deliveryAddressId }).then((res) => res.data.order);

export const fetchWishlist = () =>
  apiClient.get("/ecommerce/wishlist").then((res) => res.data.items);

export const toggleWishlist = (productId) =>
  apiClient
    .post("/ecommerce/wishlist/toggle", { productId })
    .then((res) => res.data.wishlisted);
