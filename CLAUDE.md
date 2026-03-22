# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

RAG (Retrieval-Augmented Generation) frontend built with Next.js 16, React 19, and Tailwind CSS 4. Currently a fresh scaffold — the app will serve as the UI for a RAG system.

## Commands

- `npm run dev` — start dev server (localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, core-web-vitals)

## Tech Stack & Key Details

- **Next.js 16.2.1** with App Router (`app/` directory). This is a newer version — always consult `node_modules/next/dist/docs/` before using Next.js APIs, as conventions may differ from older versions.
- **React 19** with React Compiler enabled (`reactCompiler: true` in `next.config.mjs`)
- **Tailwind CSS 4** via `@tailwindcss/postcss` plugin (PostCSS-based, no `tailwind.config.js`)
- **JavaScript** (not TypeScript), using jsconfig.json for path aliases
- Fonts: Geist and Geist Mono loaded via `next/font/google`
- ESLint 9 flat config with `eslint-config-next/core-web-vitals`
