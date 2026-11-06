import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the site runs on :5173 and forwards API calls and uploaded
// images to the server on :3001.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
    },
  },
});
