import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // null address means "show the setDeliveryAddress placeholder" - there's
  // no real default location until the user picks or auto-detects one.
  address: null,
  lat: null,
  lng: null,
};

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    setDeliveryLocation(state, action) {
      state.address = action.payload.address;
      state.lat = action.payload.lat ?? null;
      state.lng = action.payload.lng ?? null;
    },
  },
});

export const { setDeliveryLocation } = locationSlice.actions;
export default locationSlice.reducer;
