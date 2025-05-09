import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

export const postcssConfig = {
  plugins: [tailwindcss(), autoprefixer()]
};
