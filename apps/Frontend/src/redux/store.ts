import { configureStore } from "@reduxjs/toolkit";
import seleniumTaskReducer from "./slices/seleniumTaskSlice";

export const store = configureStore({
  reducer: {
    seleniumTask: seleniumTaskReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
