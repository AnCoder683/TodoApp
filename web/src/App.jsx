import { useEffect, useState } from 'react'
import axios from 'axios'

// baseURL '/api' là đường dẫn TƯƠNG ĐỐI: không có http://host:port phía trước.
// Trình duyệt tự ghép với địa chỉ của trang đang mở:
//   dev  (chặng 0, 1): http://localhost:5173/api/todos -> Vite proxy -> api
//   prod (chặng 2, 3): http://localhost/api/todos      -> nginx      -> api
// Nhờ vậy code này build một lần, chạy được ở mọi môi trường.
const api = axios.create({ baseURL: '/api' })

export default function App() {
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState('')
  const [error, setError] = useState(null)

  async function load() {
    try {
      const res = await api.get('/todos')
      setTodos(res.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function add(e) {
    e.preventDefault()
    if (!title.trim()) return
    await api.post('/todos', { title })
    setTitle('')
    load()
  }

  async function toggle(todo) {
    await api.put(`/todos/${todo.id}`, { done: !todo.done })
    load()
  }

  async function remove(todo) {
    await api.delete(`/todos/${todo.id}`)
    load()
  }

  return (
    <>
      <h1>Todo1</h1>
      {error && <p style={{ color: 'crimson' }}>Không gọi được API: {error}</p>}
      <form onSubmit={add}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Việc cần làm" />
        <button>Thêm</button>
      </form>
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.done} onChange={() => toggle(todo)} />
            <span className={todo.done ? 'done' : ''}>{todo.title}</span>
            <button onClick={() => remove(todo)}>Xoá</button>
          </li>
        ))}
      </ul>
    </>
  )
}
