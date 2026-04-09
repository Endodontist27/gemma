# Lecture Companion

## Gemma 4 Good Hackathon Write-Up

Lecture Companion is a local-first study and lecture support app built for real educational use, not just a prompt demo. Students upload lecture materials directly into the app, the system indexes those files into grounded local evidence, and every answer stays tied to the uploaded course content. The project is designed to help learners review complex teaching material, ask focused questions, inspect exactly where answers came from, and build notes from traceable evidence.

The app targets a common real-world learning problem: students are overwhelmed by dense lecture material, scattered notes, slide decks, definitions, and class documents, yet most AI tools answer from generic outside knowledge or require cloud services. Lecture Companion is built to stay grounded, private, and reproducible. It does not depend on a hosted backend for inference in the competition demo path once the local model is installed.

## What The Project Does

- imports lecture material from local files such as PDF, PPTX, Markdown, TXT, CSV, and structured JSON
- merges uploaded files into one active lecture workspace
- builds searchable grounded evidence from the uploaded files
- answers questions only from the uploaded lecture evidence or returns `unsupported`
- shows answer traceability so users can inspect the exact supporting source
- lets users bookmark evidence and create notes anchored to that exact source
- stores sessions, evidence, questions, answers, notes, bookmarks, and digests locally in SQLite

## Why This Matters

Many educational AI tools are impressive in short demos but weak in trust. They hallucinate, lose provenance, or require cloud connections that are unrealistic in low-connectivity classrooms and privacy-sensitive settings. Lecture Companion is intentionally opinionated:

- no free-form ungrounded answers
- no silent fallback to outside knowledge
- no requirement for a backend service
- local evidence remains the source of truth

This makes the project a strong fit for both:

- `Future of Education`
- `Safety & Trust`

It also fits the local-first spirit of the mobile-specialized tracks because the product is designed around on-device workflows, even though the strongest competition demo uses a desktop-local Gemma bridge for higher quality.

## Gemma 4 Use

The competition-quality demo path uses:

- `google/gemma-4-E4B-it`
- local desktop execution on an RTX 3060 12 GB class GPU
- CUDA + bitsandbytes 4-bit NF4 as the stable quality/performance profile

The mobile project also includes a smaller Android-oriented local path around:

- `google/gemma-4-E2B-it`
- GGUF / llama.cpp-style runtime integration through `llama.rn`

The repository does **not** redistribute Gemma weights. Judges should download the official model from the public source and place it in the documented local `models/` path. This is consistent with the competition rules as long as the code, setup, and methodology are clearly documented and reproducible.

## Architecture

Lecture Companion is intentionally structured as a maintainable app rather than a single demo script.

### Frontend

- Expo / React Native app shell
- dedicated presentation layer with screens, view-models, and reusable UI components
- Ask, Sessions, Materials, Notes, Community, and traceability flows

### Application Layer

- use-cases for import, workspace loading, questioning, notes, bookmarks, and answer-source inspection
- orchestrators for app bootstrap and workspace preparation
- DTOs to keep screen models separate from persistence entities

### Domain Layer

- repository contracts
- business rules for support checking and grounding
- service contracts for retrieval, generation, and runtime integration

### Infrastructure

- SQLite + Drizzle persistence
- grounded import pipeline
- multimodal evidence indexing
- retrieval and reranking pipeline
- Gemma runtime adapters for desktop and Android-oriented local paths

## RAG Pipeline

The key technical decision is that Gemma should not reread all raw files on every question. Uploaded assets are processed once into reusable local evidence.

### Import and Indexing

When a user uploads files, the app:

1. normalizes the files into local grounded assets
2. extracts structured text and searchable content
3. builds indexed evidence units and asset digests
4. stores them in SQLite for later retrieval

### Retrieval

For each question, the app:

1. retrieves candidate evidence from local indexed content
2. reranks the strongest multimodal candidates
3. assembles focused grounded context
4. asks Gemma to synthesize a final grounded answer

### Safety Boundary

If the evidence is not sufficient, the app returns `unsupported`.

## What Judges Should Test

The most important things to verify are:

1. upload lecture files locally
2. ask a course-specific question
3. confirm the answer is grounded in the uploaded material
4. inspect answer traceability
5. create a note from an evidence source
6. verify that no cloud inference service is required for the demo flow once the local model is available

Good example questions are definition and concept questions from the uploaded lecture material, especially when the answer must come from a glossary entry, slide text, or indexed evidence rather than from generic outside knowledge.

## Reproduction Guide

### Environment

- Node.js
- Python with `torch`, `transformers`, `accelerate`, and `bitsandbytes`
- Android Studio emulator for the UI shell
- RTX 3060 12 GB class GPU recommended for the competition demo path

### Steps

1. Clone the repository.
2. Run `npm install`.
3. Run `npm run db:generate`.
4. Download the official `google/gemma-4-E4B-it` model into `models/google/gemma-4-E4B-it/source/`.
5. Run `npm run check`.
6. Start the local desktop Gemma bridge with `npm run model:desktop:bridge`.
7. Start the Android development build / emulator flow.
8. Upload lecture files in the app.
9. Ask grounded questions and inspect the cited sources.

### Important Note

Model weights are intentionally excluded from the Git repository due size and redistribution practicality. The repository is designed so judges can reproduce the exact approach by installing the official model locally.

## Product Strengths

- local-first educational workflow
- grounded answers instead of generic chatbot responses
- answer traceability built into the Ask experience
- maintainable layered architecture
- local SQLite persistence instead of one monolithic blob
- realistic user flow for lecture review and study support

## Current Limitations

- the strongest competition demo path is desktop-local rather than pure phone-local
- some multimodal ingestion paths are stronger than others depending on file type
- large visual contexts can still pressure a 12 GB GPU, so the bridge uses careful fallback logic
- PPTX full-slide visual rendering is less complete than text extraction plus embedded media handling on this machine

## Why This Is A Good Gemma 4 Project

Lecture Companion shows Gemma 4 in a practical, trustworthy workflow:

- it solves a real learning problem
- it uses Gemma for grounded reasoning rather than generic chat
- it emphasizes transparency and source-based answers
- it respects offline and privacy constraints
- it demonstrates how Gemma can power a full application, not just a benchmark script

## Suggested Track Fit

- `Main Track`
- `Future of Education`
- `Safety & Trust`
- potentially `Cactus Prize` because the user-facing product is local-first mobile-oriented, with desktop-local routing used to improve demo quality during development and evaluation

## Repository Deliverables

This repository is intended to be the public code deliverable for the hackathon. The final competition submission should pair it with:

- a short demo video
- a Kaggle write-up summary
- screenshots or media for the gallery

This document can also serve as the base text for the Kaggle write-up page.
