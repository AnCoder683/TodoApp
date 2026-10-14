// Chặng 0: nạp .env ở thư mục gốc (file compose cũng đọc), không tạo .env riêng cho api.
// Chặng 1+: trong container DATABASE_URL do compose bơm vào, không có file thì dotenv bỏ qua.
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: "../.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // process.env thay vì env(): env() báo lỗi ngay khi nạp config nếu thiếu biến,
    // làm `prisma generate` lúc docker build (chưa có DATABASE_URL, cũng không cần DB) bị chặn.
    // Lệnh thật sự cần DB (migrate...) vẫn báo lỗi nếu thiếu.
    url: process.env.DATABASE_URL,
  },
});
