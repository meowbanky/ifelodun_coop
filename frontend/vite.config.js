import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: "./postcss.config.cjs",
  },
  server: {
    host: "0.0.0.0", // Bind to all network interfaces
    port: 5173, // Ensure the port matches what you're using
  },
});
