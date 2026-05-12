# 結伴釐算

> 聚會宴饗，同遊起行；隨心分攤，優雅結清。

旅遊、聚餐分帳 Web App。多人建立活動、記錄費用、設定分攤比例，即時同步（SSE），一鍵複製結算報告。

## 功能

- **活動管理**：建立 / 編輯 / 刪除旅遊或聚餐活動，支援日期區間
- **成員**：自訂 emoji 頭像，inline 編輯名稱
- **費用**：平均分攤或自訂比例（附即時進度條），支援數學算式輸入（`120+80`）
- **結算**：最優轉帳路徑計算、每人餘額一覽、還款紀錄、一鍵複製文字報告
- **即時同步**：Server-Sent Events，多人開啟同一活動自動更新
- **主題**：莫蘭迪 / 粉櫻 / 海藍 / 抹茶，localStorage 持久化
- **管理員模式**：密碼登入後可建立、編輯、刪除活動並標記「帳目兩訖」
- **唯讀模式**：已結清活動對一般訪客鎖定，防止誤操作

## Tech Stack

| 層 | 技術 |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Database | PostgreSQL (Zeabur) |
| ORM | Prisma 7 (`prisma.config.ts`) |
| Realtime | Server-Sent Events (SSE) |
| Deploy | Zeabur |

## 開始開發

### 1. 安裝相依套件

```bash
npm install
```

### 2. 環境變數

複製範本並填入實際值：

```bash
cp .env.example .env
```

| 變數 | 說明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `ADMIN_PASSWORD` | 管理員登入密碼 |

### 3. 初始化資料庫

若資料庫是全新的，執行 migrate deploy 建立資料表：

```bash
npx prisma migrate deploy
```

若資料庫已存在（例如接手既有 DB），改用 baseline 標記：

```bash
npx prisma migrate resolve --applied 20250512000000_init
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

## 資料庫 Schema

```
Event
  └─ Participant[]        (onDelete: Cascade)
  └─ Expense[]            (onDelete: Cascade)
       └─ ExpenseShare[]  (onDelete: Cascade)
  └─ Repayment[]          (onDelete: Cascade)
```

新增 migration：

```bash
npx prisma migrate dev --name <migration-name>
```

## 部署

1. 在部署平台設定 `DATABASE_URL` 和 `ADMIN_PASSWORD` 環境變數
2. `npm run build` 會自動執行 `prisma generate`（`postinstall` hook）
3. 首次部署後執行 `npx prisma migrate deploy` 套用 migration
