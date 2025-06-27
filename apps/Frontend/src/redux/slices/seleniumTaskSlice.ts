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

const seleniumTaskSlice = createSlice({
  name: "seleniumTask",
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

export const { setTaskStatus, clearTaskStatus } = seleniumTaskSlice.actions;
export default seleniumTaskSlice.reducer;
