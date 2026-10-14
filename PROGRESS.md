# Tiến độ: Học Docker qua Todo App

> File này ghi lại tiến độ để các session sau đọc và làm tiếp.
> Cập nhật cuối mỗi buổi: đánh dấu checklist, ghi quyết định mới, ghi bước tiếp theo.

## Mục tiêu
Tự build từ con số 0 một app đơn giản để **thấy Docker được dùng thế nào** trong quy trình dev → build → production.
Không cần app xịn. Không có VPS, production sẽ **mô phỏng trên máy**.

## Cách làm việc
- Claude **thảo luận và hướng dẫn, không viết code thay**. Người học tự code, Claude giải thích và review.
- Kiểu **cầm tay chỉ việc**: Claude chỉ rõ tạo file nào, từng dòng viết gì kèm giải thích. Người học tự gõ.
- **Trọng tâm là HIỂU Docker, không phải xây app.** Phần app (React/Express) giữ tối giản. Với câu hỏi về Docker, Claude **đề xuất luôn kèm giải thích "vì sao"**, không đố ngược lại. Ưu tiên thí nghiệm để *thấy tận mắt*.
- Mỗi chặng phải chạy được rồi mới sang chặng sau.

## Môi trường
- Windows 11, Docker 29.6.1, Docker Compose v5.2.0, Node v26.7.0
- Thư mục project: `D:\todoapp` (ổ Windows, lưu ý tốc độ/hot reload khi bind mount ở chặng 1)

## Stack và kiến trúc
- **web**: React (Vite)
- **api**: Express
- **db**: Postgres

```
DEV                                    PROD (mô phỏng)
browser                                browser
  ├─ :5173 → web (Vite dev server)       └─ :80 → nginx
  └─ :3000 → api (nodemon)                        ├─ /     → file tĩnh React đã build
              └─ db (Postgres)                    └─ /api  → api (node)
                                                               └─ db (Postgres + volume)
```

## Lộ trình
- [x] **Chặng 0**: App chạy local, chỉ dùng Docker để chạy Postgres
- [x] **Chặng 1**: Compose cho dev (đủ 3 service, hot reload, healthcheck, mạng theo tên service)
- [ ] **Chặng 2**: Dockerfile prod (multi-stage, image gọn, user không phải root; web = Node build → nginx)
- [ ] **Chặng 3**: Mô phỏng production (compose prod, volume, restart, secrets, tag v1/v2, rollback, backup/restore db)
- [ ] **Chặng 4** (tuỳ chọn): CI với GitHub Actions → push image lên GHCR → pull về chạy

## Quyết định đã chốt
| # | Quyết định | Lý do |
|---|---|---|
| 1 | Monorepo: `web/`, `api/`, compose ở gốc | Dễ học, một lệnh chạy cả hệ thống |
| 2 | ~~`pg` thuần~~ → **Prisma** (người học chọn) | Quen tay hơn. Bài học Docker: `migrate dev` (dev) khác `migrate deploy` (prod); chặng 3 phải quyết định migrate chạy ở đâu |
| 3 | Ở prod, React gọi API qua đường dẫn tương đối `/api` (nginx proxy) | Tránh bẫy URL API bị gắn cứng lúc build |
| 4 | Image `postgres:17-alpine` (ghi rõ major) | Dữ liệu Postgres không tương thích giữa các bản major, `latest` có thể làm DB không khởi động được |
| 5 | **Named volume** cho dữ liệu DB, không bind mount | Container là đồ dùng xong vứt, còn volume mới là nơi giữ dữ liệu. Trên Windows, bind mount cho Postgres hay lỗi quyền và chậm |
| 6 | ~~`127.0.0.1:5432:5432`~~ → ~~`5432:5432`~~ (để test LAN) → **`127.0.0.1:5432:5432`** (chặng 1, bước 7) | App không cần cổng nữa (api vào `db:5432` qua mạng compose, migrate chạy trong container). Giữ cổng trên loopback cho DBeaver/pgAdmin trên máy, không lộ ra Wi-Fi Public với mật khẩu yếu. Prod (chặng 3) bỏ hẳn `ports` của db |
| 7 | Cấu hình qua `.env` (không commit) + `.env.example` (commit) | Compose tự đọc `.env` ở gốc. Postgres đọc `POSTGRES_*`, Prisma đọc `DATABASE_URL` |
| 8 | Chặng 0 đã dùng compose (1 service `db`) | Sang chặng 1 chỉ cần thêm service |
| 10 | **Prisma 6** (`prisma@6`, generator `prisma-client-js`), không dùng bản mới nhất | `npm install prisma` ra 8.0.0-rc (bản RC bị gắn tag `latest`), init kiểu mới, tự sinh thư mục agent lạ. Bản 6 ổn định, CommonJS `require` được. Bài học cho Docker: **ghim version** (như #4) |
| 11 | Một `.env` duy nhất ở gốc; `api` nạp `../.env` qua dotenv (`prisma.config.ts`, `src/index.js`) | Compose và api dùng chung. Chặng 1 trong container không có file, biến do compose bơm vào |
| 9 | ~~Subagent `helper`~~ (không tồn tại) → khi người học yêu cầu, giao việc app cho **Agent model haiku** (rẻ). **Không** đụng phần Docker | Phần app không phải trọng tâm, giao bớt. Phần Docker người học tự gõ để học |
| 13 | `prisma.config.ts` đọc `process.env.DATABASE_URL` thay vì `env("DATABASE_URL")` | `env()` báo lỗi ngay khi nạp config nếu thiếu biến → `prisma generate` lúc `docker build` bị chặn dù không cần DB. Nguyên tắc: **image build được mà không cần biết nó chạy ở đâu**; biến kết nối chỉ cần lúc chạy |
| 14 | `.gitattributes`: `* text=auto eol=lf` | Git for Windows mặc định `autocrlf=true` → checkout ra CRLF. File COPY vào image Linux mà có CRLF thì script shell/shebang hỏng (`/bin/sh^M`). Ép LF để image build giống nhau dù clone trên Windows hay Linux (CI chặng 4) |
| 12 | `web` dùng **axios 1.20.0 ghim chính xác** (`--save-exact`), `axios.create({ baseURL: '/api' })` | Ghim version + lockfile để chặng 2 `npm ci` build image tái lập được |

## App (tối giản)
- Bảng `todos`: `id`, `title`, `done`, `created_at`
- API: `GET /api/todos`, `GET /api/todos/:id`, `POST /api/todos`, `PUT /api/todos/:id`, `DELETE /api/todos/:id`, `GET /health` (dùng từ chặng 1)

## Đang ở đâu
**Xong chặng 0** (2026-10-14). Trên máy: `api/` (Express 5 ESM + Prisma 6, `npm run dev` :3000), `web/` (Vite 8 + React 19 + axios, `npm run dev` :5173, proxy `/api`). Docker chỉ chạy `db`. Một `.env` ở gốc. Migration `20261014025057_init` đã áp dụng.
- Gõ lệnh trong PowerShell 5.1: dùng `Invoke-RestMethod` thay `curl.exe` khi gửi JSON.
- Còn sót file `D:	odoapp_vite.log` ngoài project (Claude không xoá được), nhắc người học xoá nếu chưa.

**Chặng 1, xong bước 1–3 (2026-10-14):** `compose.yaml` có `db` (healthcheck `pg_isready`, interval 5s/timeout 3s/retries 5/start_period 10s) + `api` (build `Dockerfile.dev`, bind mount `./api:/app` + volume ẩn danh `/app/node_modules`, `DATABASE_URL` ghép từ `POSTGRES_*` với host `db`, cổng 3000, `depends_on: db: condition: service_healthy`). `api/src/index.js` nghe `0.0.0.0:${PORT||3000}`. Người học đã dọn sạch Docker (mất volume `db-data` cũ), DB mới đã chạy `docker compose exec api npx prisma migrate deploy`, có 1 todo "tu container". API trong container chạy OK.

**Chặng 1, xong bước 5 (2026-10-14):** cả 3 service (`db`, `api`, `web`) chạy bằng `docker compose up -d --build`, mở `http://localhost:5173` dùng được, hot reload cả hai phía. Bước 6–7 + sửa healthcheck cũng xong → **XONG CHẶNG 1** (2026-10-14). Các thí nghiệm tuỳ chọn còn lại (`start_interval`, cổng 5433, hash volume ẩn danh) bỏ qua.

**Bước tiếp theo: Chặng 2** (Dockerfile prod). Dự kiến: (1) `api/Dockerfile` multi-stage: stage cài deps + `prisma generate`, stage chạy chỉ có prod deps, `ENV NODE_ENV=production`, `USER node`, `CMD node`; COPY `prisma/migrations`. (2) `web/Dockerfile`: stage Node `npm run build` → stage `nginx` phục vụ `dist` + proxy `/api` (quyết định #3). (3) So sánh kích thước image dev vs prod (`docker images`), kiểm tra `whoami` trong container.

## Bước tiếp theo: Chặng 1 (compose dev, người học tự gõ, Claude cầm tay chỉ việc)
1. ~~Build + kiểm tra Dockerfile.dev~~ ✔ (context 2.94kB, engine `linux-musl-openssl-3.0.x`, sửa code chỉ `COPY . .` chạy lại)
2. ~~Service `api`~~ ✔
3. ~~Healthcheck~~ ✔ (thấy api Created cùng lúc db nhưng Started sau ~5s). **Còn treo, chưa xác nhận đã làm:**
   - ~~Sửa test thành `pg_isready -h 127.0.0.1 ...`~~ ✔ (server tạm lúc initdb chỉ nghe socket → healthy sớm giả). Health log giờ là `127.0.0.1:5432 - accepting connections` (trước: `/var/run/postgresql:5432`)
   - Tuỳ chọn `start_interval: 1s` (healthy nhanh hơn)
   - Thí nghiệm 2: thêm `-p 5433` → db `unhealthy`, api không start (`dependency failed to start`)
   - Thí nghiệm theo dõi hash volume ẩn danh: tạo lại container (giữ hash) vs `down` rồi `up` (hash mới, cũ thành dangling)
4. ~~Hot reload~~ ✔ `command: ["npm","run","dev","--","-L"]` trong compose (Dockerfile.dev giữ `CMD` không `-L`). Thấy: file trong container đã đổi nhưng nodemon không restart → thêm `-L` thì restart. Polling tốn ~1% CPU lúc nghỉ. Gợi ý sau chặng 1: thử `docker compose watch` / đặt project trong ổ WSL.
   (cũ) Hot reload trên bind mount từ ổ D: (WSL2 không chuyển inotify từ ổ Windows) → nodemon `-L` / Vite `usePolling`. Thí nghiệm: tắt polling, sửa file, thấy không reload.
5. ~~Service `web`~~ ✔ `web/Dockerfile.dev` (`CMD ["npm","run","dev","--","--host"]`: luôn cần trong container → để trong Dockerfile), `web/.dockerignore` (`node_modules`, `dist`, `*.log`). Compose: `API_URL: http://api:3000`, `WATCH_POLLING: "true"` (phải có ngoặc kép), bind mount + volume ẩn danh `node_modules`, `depends_on: - api` (dạng ngắn, chỉ thứ tự). `vite.config.js`: `watch.usePolling: process.env.WATCH_POLLING === 'true'` (không dùng tiền tố `VITE_` vì bị lộ xuống trình duyệt). Đã thấy: `Network: 172.18.0.4 eth0`, `exec web wget http://api:3000/api/todos` OK, HMR OK. Thí nghiệm bỏ `--host`: người học bỏ qua, đã hiểu (cổng publish nhưng app nghe sai chỗ).
6. ~~Migrate ở dev~~ ✔ Thêm `priority Int @default(0)`, chạy `docker compose exec api npx prisma migrate dev --name add_priority` → migration `20261014091715_add_priority` (1 câu `ALTER TABLE`) hiện trên ổ D: nhờ bind mount hai chiều (phải commit). API chưa có `priority` cho tới khi `docker compose restart api` (client mới nằm trong volume ẩn danh, nodemon không theo dõi, process giữ client cũ). `node_modules` trên Windows vẫn là client cũ (hai bộ `node_modules` tách nhau).
7. ~~Cổng 5432~~ ✔ Đổi `127.0.0.1:5432:5432` (quyết định #6). Kiểm tra: PORTS `127.0.0.1:5432->5432/tcp`; `Test-NetConnection 127.0.0.1 -Port 5432` True, qua IP Wi-Fi `192.168.1.10` False; app qua :5173 vẫn chạy.

## Thí nghiệm chặng 0
- [x] `docker compose down` rồi `up` lại → dữ liệu còn (bảng `thu` vẫn còn sau khi container + network bị xoá và tạo lại)
- [x] `docker compose down -v` → dữ liệu mất (hiểu `-v` xoá gì). Thấy qua `docker events --filter type=volume`: `destroy` rồi `create` mới, log có lại `CREATE DATABASE`
- [x] Đổi `POSTGRES_PASSWORD` trong `.env` rồi chạy lại → mật khẩu mới **không** có tác dụng. Container nhận biến mới (`printenv` ra giá trị mới) nhưng đăng nhập qua mạng bằng mật khẩu mới thì `password authentication failed`, mật khẩu cũ vẫn vào được. Vì `POSTGRES_*` chỉ dùng khi khởi tạo volume trống; mật khẩu thật nằm trong dữ liệu (`pg_authid`). Muốn đổi: `down -v` (mất dữ liệu) hoặc `ALTER USER` (giữ dữ liệu)
- [x] `docker compose exec db psql ...` → vào DB không cần cài psql trên máy (kết nối nội bộ = trust, không hỏi mật khẩu)
- [x] Xem volume nằm đâu: `docker volume inspect` → Mountpoint là đường dẫn Linux trong VM WSL2, không phải ổ Windows. Xem nội dung bằng cách gắn volume vào container tạm: `docker run --rm -v todoapp_db-data:/xem alpine ls /xem`; `PG_VERSION` = 17 (lý do quyết định #4)

## Câu hỏi còn mở
- ~~Docker Desktop đang dùng backend WSL2 phải không?~~ → **Đúng**, WSL2 (kernel `6.18.33.2-microsoft-standard-WSL2`). Cổng 5432 trên máy đang trống, dùng 5432 được.

## Nhật ký
- **2026-10-13**: Chốt mục tiêu, stack, kiến trúc dev/prod, lộ trình 5 chặng. Tạo file tiến độ. Bắt đầu chặng 0. Chốt schema/API, chọn Prisma, chốt các quyết định Postgres-trong-Docker (#4–#8). Người học nhấn mạnh: trọng tâm là hiểu Docker, Claude nên đề xuất kèm giải thích thay vì đố. Chuyển sang kiểu cầm tay chỉ việc; đã hướng dẫn chi tiết bước 1 (`.gitignore`, `.env.example`, `.env`, `compose.yaml` + lệnh kiểm tra), người học chưa báo kết quả. Tạo subagent `helper` cho việc vặt (quyết định #9), sửa CLAUDE.md cho rõ ranh giới và nạp `@PROGRESS.md`.
- **2026-10-13 (tiếp)**: Xong bước 1 và cả 5 thí nghiệm chặng 0. Người học đổi quyết định #6 sang `5432:5432` (mở LAN), giữ mật khẩu yếu `123` để học nhanh. Học thêm: `docker events` để thấy Docker thật sự làm gì (compose v5 tạo lại container nhưng chỉ in `Started`); kết nối qua mạng compose bằng container tạm `docker run --rm --network todoapp_default ... @db:5432` (DNS theo tên service); kết nối nội bộ qua `exec` là trust, không kiểm mật khẩu. Chốt lại bài học chính: **biến `POSTGRES_*` là "công thức tạo DB lần đầu"**: entrypoint của image kiểm tra `$PGDATA/PG_VERSION`, có rồi thì bỏ qua cả 3 biến (do image quyết định, không phải compose). Dừng buổi trước bước 3.
- **2026-10-13 (cuối buổi)**: Tìm hiểu cho máy khác trong LAN kết nối. Kiểm tra: `com.docker.backend` nghe `::`:5432, IP Wi-Fi `192.168.1.11`, Windows Firewall có rule "Docker Desktop Backend: Allow: Public", Wi-Fi đang ở profile Public. **Đính chính:** trên Docker Desktop Windows, firewall *không* bị bỏ qua (đó là chuyện iptables trên Linux), nhưng Docker Desktop tự thêm rule Allow, nên kết quả là LAN vào được. Rủi ro: mạng công cộng + `admin/123`. Chưa thử từ máy thứ hai.
- **2026-10-14**: Docker Desktop tắt, db không tự lên dù `restart: unless-stopped` vì người học đã `down` trước khi tắt máy (container bị xoá, restart policy đi theo container). Xoá `todo-docker/`. Dựng `api/` (quyết định #10, #11).
- **2026-10-14 (tiếp)**: Xong bước 3. Học: `migrate dev` = sinh SQL + chạy + generate; `migrate deploy` (prod) chỉ chạy file có sẵn, đối chiếu bảng `_prisma_migrations` nằm trong volume → `prisma/migrations/` phải commit và COPY vào image. Thấy Express in stack trace khi không có `NODE_ENV` → chặng 2 đặt `ENV NODE_ENV=production`.
- **2026-10-14 (tiếp)**: Viết `web/`. Giải thích vì sao dùng đường dẫn tương đối `/api` (quyết định #3): JS chạy trong trình duyệt, không chạy trong container; tránh gắn cứng URL lúc build; cùng origin nên không CORS. Proxy target đọc `API_URL` để chặng 1 chỉ cần đặt biến trong compose.
- **2026-10-14 (cuối buổi)**: Viết `web/` (proxy `/api`), Haiku chuyển sang axios 1.20.0 (quyết định #12). Người học chạy thử trên trình duyệt OK → **xong chặng 0**. Lên kế hoạch chặng 1.
- **2026-10-14 (buổi mới)**: Bắt đầu chặng 1, bước 1. Giải thích từng dòng Dockerfile.dev (cache layer, `npm ci`, `EXPOSE` chỉ là tài liệu, exec form của CMD) và `.dockerignore` (build context; chặn `node_modules` Windows đè lên bản Linux). Thử trong container tạm thì thấy `prisma generate` lúc build lỗi `PrismaConfigEnvError` do `env("DATABASE_URL")`. Học: cú pháp shell `VAR=x lệnh` (biến chỉ sống trong một lệnh; `RUN` dạng chuỗi chạy qua `/bin/sh -c`), so sánh `RUN VAR=` / `ARG` / `ENV`; `DATABASE_URL` do Prisma yêu cầu (khai báo trong schema + config), cấu trúc URI `postgresql://user:pass@host:port/db`, chặng 1 phải đổi `localhost` → `db`. Người học chọn bỏ chuỗi giả, Claude sửa `prisma.config.ts` sang `process.env` (quyết định #13), đã kiểm tra `validate` + `migrate status` trên máy OK. Người học gõ xong 2 file, chưa build. Dừng buổi.
- **2026-10-14 (chặng 1, bước 1–3)**: Build `Dockerfile.dev` OK, thấy cache layer và engine `linux-musl`. Người học tự gõ trước service `api`. Học kỹ dòng `- /app/node_modules`: không có `:` → volume ẩn danh (hash); mount theo độ sâu (cha trước, con đè lên); copy-up từ image khi volume trống, chỉ một lần; compose tìm lại volume ẩn danh **qua container cũ** (không qua tên) → `down` rồi `up` thì volume mới, cũ thành dangling; `up -V` để làm mới khi thêm thư viện. Ẩn dụ bàn/khăn trải bàn/hộp. Healthcheck + `service_healthy` chạy OK. Người học dọn sạch Docker → mất `db-data`, thấy lỗi `table public.todos does not exist`, chạy `migrate deploy` qua `exec` → OK. Bài học: volume là thứ duy nhất giữ dữ liệu; cache BuildKit tách khỏi image (manifest sha giống hệt khi dựng lại).
- **2026-10-14 (chặng 1, bước 4)**: Thấy inotify không qua bind mount từ ổ D:. Người học sửa `CMD` trong Dockerfile.dev trước → `up -d` không có tác dụng (`Running`, không rebuild) → học: sửa Dockerfile cần `--build`, sửa compose chỉ cần tạo lại container; `docker compose config` để xem compose đọc gì. Chọn đặt `-L` ở `command:` của compose (Dockerfile = sản phẩm, compose = cách chạy trên máy này). Hot reload OK.
- **2026-10-14 (chặng 1, bước 5)**: Thêm service `web`. Học: `--host` để Vite nghe `0.0.0.0` (port publish đi vào `eth0`, không vào `127.0.0.1` của container); proxy Vite chạy trong container nên dùng được tên `api`; biến môi trường là chuỗi; tiền tố `VITE_` lộ xuống client; Vite chỉ đọc config lúc khởi động → `docker compose restart web`. Lockfile đã có binding `linux-x64-musl` nên `npm ci` trong alpine OK. Cả 3 service chạy trong Docker, hot reload cả api lẫn web.
- **2026-10-14 (chặng 1, bước 6)**: `migrate dev` trong container. Học: dotenv trong container `injected env (0)` vì `../.env` = `/.env` không tồn tại, và dotenv không ghi đè biến có sẵn → compose thắng; `at db:5432` chứng tỏ dùng URL của compose. Lần đầu quên lưu file → `Already in sync`. Thấy migration sinh trong container hiện trên máy; API giữ client cũ đến khi restart. Bỏ qua banner Prisma 8 RC (quyết định #10). Shadow database chạy được vì user là superuser.
- **2026-10-14 (chặng 1, bước 7)**: Đổi cổng db sang `127.0.0.1:5432:5432`. Học: cú pháp `IP:cổng_máy:cổng_container`, bỏ IP = `0.0.0.0` (mọi card mạng); cổng publish là cho bên ngoài vào, container nói chuyện với nhau không cần nó. Sửa `ports` → `up -d` tạo lại container db, dữ liệu còn nhờ volume. IP Wi-Fi giờ là `192.168.1.10` (trước `.11`, DHCP đổi).
- **2026-10-14 (chặng 1, healthcheck)**: Sửa healthcheck sang `pg_isready -h 127.0.0.1` (kiểm tra đúng đường TCP mà api dùng). Thí nghiệm container tạm `pgtest` so sánh socket/TCP lúc initdb. Lần đầu sửa file nhưng container db vẫn cũ (health log còn `/var/run/postgresql`) → healthcheck gắn vào container lúc tạo, phải `up -d` để tạo lại. Compose v5 chỉ in `Healthy`, không in `Recreated`.
- **2026-10-14 (đóng chặng 1)**: Người học bỏ qua thí nghiệm `--host` (đã hiểu). Đánh dấu xong chặng 1, chuẩn bị chặng 2.
- **2026-10-14 (git)**: `git init -b main`, thêm `.gitattributes` (quyết định #14), commit đầu `95dffe0` (không có `.env`, `node_modules`), push lên `origin` (repo GitHub trống).
