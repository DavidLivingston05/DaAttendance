# 👑 DaAttendance — Sunday School Attendance Hub

`DaAttendance` is a highly polished, multi-location church and ministry student attendance tracking platform. Tailored specifically for Sunday schools and youth fellowships, it features campus location mapping, class program cohorts, volunteer directory logs, and advanced analytical reports.

The application has been transformed into a **purely client-side standalone SPA** utilizing global fetch interception. All attendance rolls, membership setups, and campus directories are securely persisted inside the browser's `localStorage` — meaning it runs **100% serverless** with zero backend database dependencies!

---

## ✨ Features

- **🌓 Dynamic Light & Cosmic Night Modes**: A beautifully crafted UI featuring a custom-themed Cosmic Starfield night mode complete with pulsing stars and nebulae.
- **📍 Multi-Campus Location Support**: Track attendance separately across various physical campuses (such as `R.O.S`, `TNHB`, and `ATTHIPATTU`).
- **👦 Junior & Youth Class Cohorts**: Fully pre-seeded groups tracking kids and students from `Little Lambs (LKG-UKG)` through `Morning Stars (College)`.
- **✍️ High-Contrast Attendance Desk**: A highly legibile checkbox roll call manager for both junior students and senior volunteers/directors.
- **📅 2026 Sunday Calendar Integration**: An interactive calendar grid mapping active roll calls and tracking overall conduction rates.
- **📊 Star Analytics & Reports**: Intelligent tracking of missing student alerts, perfect attendance lists, and individual member profile metrics.

---

## 🚀 How to Run Locally

Get the application up and running on your local machine in just a few steps:

### 1. Clone & Install Dependencies
Navigate to your project root folder and install packages:
```bash
npm install
```

### 2. Launch the Local Development Server
Boot up the fast Vite static server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to interact with the dashboard!

---

## 📦 Production & Deployment

To compile the standalone React client bundle for hosting on **Vercel**, **GitHub Pages**, or **Netlify**:

```bash
# Build the production optimized static bundle
npm run build
```
This builds all assets into the `/dist` directory, which can be uploaded directly to any static web host.
