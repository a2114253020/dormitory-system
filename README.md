# Dormitory Management System (Full-stack)

一个可本地一键启动的“宿舍管理系统”MVP：

- 后端：Node.js (Express + TypeScript) + Prisma + PostgreSQL
- 前端：React + Vite + TypeScript + Ant Design
- 鉴权：JWT + RBAC（admin / dorm_manager / student）
- 部署：Docker Compose

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up -d --build
```

启动后：
- 前端：http://localhost:5173
- 后端：http://localhost:3000/health

## Default accounts

首次启动会自动 seed：
- admin: `admin@local` / `Admin123!`

> 生产环境请务必修改密码与 JWT secret。

## What’s included (MVP)

- 登录/注册（管理员创建用户）
- 楼栋/房间/床位 CRUD
- 学生入住/退宿/换寝
- 报修工单（学生提单→宿管/管理员处理）

## Dev (without Docker)

Backend:
```bash
cd backend
npm i
npm run db:up   # requires postgres
npm run prisma:migrate
npm run seed
npm run dev
```

Frontend:
```bash
cd frontend
npm i
npm run dev
```
