import { configureStore } from "@reduxjs/toolkit";
import seleniumClaimSubmitTaskReducer from "./slices/seleniumClaimSubmitTaskSlice";
import seleniumEligibilityCheckTaskReducer  from "./slices/seleniumEligibilityCheckTaskSlice";

export const store = configureStore({
  reducer: {
    seleniumClaimSubmitTask: seleniumClaimSubmitTaskReducer,
    seleniumEligibilityCheckTask: seleniumEligibilityCheckTaskReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
