// Shared role -> color mapping so the dashboard's role breakdown and the
// users table's role badges use the same palette (visual consistency
// across the admin panel, not just within one tab).
const ROLE_COLORS = {
  ADMIN: "#EF4444",
  CUSTOMER: "#3B82F6",
  VENDOR: "#0FAE58",
  RESTAURANT_OWNER: "#F59E0B",
  RIDER: "#8B5CF6",
  DELIVERY_AGENT: "#06B6D4",
};
const FALLBACK_COLOR = "#6B7280";

export function getRoleColor(role) {
  return ROLE_COLORS[role] || FALLBACK_COLOR;
}

export default ROLE_COLORS;
