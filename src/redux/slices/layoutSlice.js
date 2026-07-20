import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Ordered list of module ids. null means "use the default order".
  moduleOrder: null,
};

const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    setModuleOrder(state, action) {
      state.moduleOrder = action.payload;
    },
  },
});

export const { setModuleOrder } = layoutSlice.actions;
export default layoutSlice.reducer;
