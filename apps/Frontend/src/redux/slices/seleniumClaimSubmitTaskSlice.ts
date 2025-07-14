import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type TaskStatus = "idle" | "pending" | "success" | "error";

export interface SeleniumTaskState {
  status: TaskStatus;
  message: string;
  show: boolean;
}

const initialState: SeleniumTaskState = {
  status: "idle",
  message: "",
  show: false,
};

const seleniumClaimSubmitTaskSlice = createSlice({
  name: "seleniumClaimSubmitTask",
  initialState,
  reducers: {
    setTaskStatus: (
      state: SeleniumTaskState,
      action: PayloadAction<Partial<SeleniumTaskState>>
    ) => {
      return { ...state, ...action.payload, show: true };
    },
    clearTaskStatus: () => initialState,
  },
});

// ✅ Make sure you're exporting from the renamed slice
export const { setTaskStatus, clearTaskStatus } = seleniumClaimSubmitTaskSlice.actions;
export default seleniumClaimSubmitTaskSlice.reducer;
