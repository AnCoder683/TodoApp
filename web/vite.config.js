import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Trình duyệt gọi /api/... vào chính Vite (:5173), Vite chuyển tiếp sang api.
    // File này chạy trong Node (Vite dev server), KHÔNG chạy trong trình duyệt,
    // nên target có thể là bất kỳ tên nào mà máy chạy Vite phân giải được:
    //   chặng 0: Vite chạy trên máy  -> http://localhost:3000
    //   chặng 1: Vite chạy trong container -> compose đặt API_URL=http://api:3000
    proxy: {
      "/api": process.env.API_URL || "http://localhost:3000",
    },
    
    watch: {
      // Chỉ bật khi compose đặt biến này (bind mount từ ổ Windows không có inotify)
      usePolling: process.env.WATCH_POLLING === "true",
    },
  },
});
