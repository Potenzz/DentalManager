import { configureStore } from "@reduxjs/toolkit";
import seleniumClaimSubmitTaskReducer from "./slices/seleniumClaimSubmitTaskSlice";
import seleniumEligibilityCheckTaskReducer  from "./slices/seleniumEligibilityCheckTaskSlice";
import seleniumEligibilityBatchCheckTaskReducer from "./slices/seleniumEligibilityBatchCheckTaskSlice";

export const store = configureStore({
  reducer: {
    seleniumClaimSubmitTask: seleniumClaimSubmitTaskReducer,
    seleniumEligibilityCheckTask: seleniumEligibilityCheckTaskReducer,
    seleniumEligibilityBatchCheckTask: seleniumEligibilityBatchCheckTaskReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
