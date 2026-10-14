// Chặng 0: api chạy trên máy, đọc .env ở thư mục gốc (cùng file compose dùng).
// Chặng 1: api chạy trong container, compose bơm biến qua `environment:`
// nên không còn file .env nào ở đây. dotenv không tìm thấy file thì cũng không lỗi.
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

// Healthcheck (dùng từ chặng 1): kiểm tra cả kết nối DB, không chỉ "process còn sống"
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'db_unreachable' });
  }
});

app.get('/api/todos', async (req, res) => {
  const todos = await prisma.todo.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(todos);
});

app.get('/api/todos/:id', async (req, res) => {
  const todo = await prisma.todo.findUnique({ where: { id: Number(req.params.id) } });
  if (!todo) return res.status(404).json({ error: 'not found' });
  res.json(todo);
});

app.post('/api/todos', async (req, res) => {
  const { title } = req.body ?? {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  const todo = await prisma.todo.create({ data: { title } });
  res.status(201).json(todo);
});

app.put('/api/todos/:id', async (req, res) => {
  const { title, done } = req.body ?? {};
  try {
    const todo = await prisma.todo.update({
      where: { id: Number(req.params.id) },
      data: { title, done },
    });
    res.json(todo);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not found' });
    throw err;
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    await prisma.todo.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not found' });
    throw err;
  }
});

// Lắng nghe 0.0.0.0 thay vì localhost: trong container, "localhost" chỉ là
// bên trong container, cổng publish ra ngoài sẽ không tới được app.
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`api listening on :${PORT}`));
