# Kaggle Submission Checklist

Use this checklist for the final Gemma 4 Good Hackathon submission.

## Already Ready

- Public code repository: `https://github.com/Endodontist27/gemma`
- Competition write-up draft: `COMPETITION_WRITEUP.md`
- Judge quickstart: `README.md`
- License file: `LICENSE`
- Model weights excluded from git
- Reproduction path documents the official `google/gemma-4-E4B-it` download and local `models/` path

## Required Kaggle Fields

- Submit a Kaggle write-up.
- Select the relevant track or tracks.
- Attach the public GitHub repository link.
- Attach a public demo video.
- Attach a live demo URL or uploaded demo files.
- Add a cover image.
- Add screenshots or media gallery images.
- Submit before the competition deadline.

## Recommended Track Selection

- Main Track
- Future of Education
- Safety & Trust
- Cactus Prize only if the submission form invites a special-track selection and the description is framed carefully as a mobile workflow that routes heavyweight Gemma reasoning to a local desktop runtime. Do not lead with this over the education and trust tracks.

## Demo Video Checklist

Keep the video short and direct.

1. Show the app starting in a clean workspace.
2. Upload real lecture files.
3. Show the workspace indexing state.
4. Ask one grounded question that succeeds.
5. Open a cited source from the answer.
6. Create a note anchored to that source.
7. Ask one unsupported question and show that the app refuses to guess.
8. Mention that the demo uses local `google/gemma-4-E4B-it` through the desktop bridge.

## Live Demo Option

Preferred simple option:

- Attach the repository and demo video.
- Attach lightweight demo files or screenshots if Kaggle asks for files.
- Explain that model weights are not redistributed and must be downloaded from the official Gemma source into the documented local path.

Avoid promising a hosted cloud backend. The product story is local-first.

## Paste-Ready Short Description

Lecture Companion is a local-first study app for lecture audiences. Users upload PDFs, PPTX files, notes, and glossary material into one active workspace. The app indexes those files locally, uses Gemma 4 to answer only from the uploaded evidence, and exposes source traceability for every supported answer. Students can inspect citations, bookmark evidence, and create notes anchored to the source that supported the answer. The competition demo uses `google/gemma-4-E4B-it` locally on desktop hardware for high-quality grounded reasoning, while the mobile app provides the lecture workflow and Android UI.

## Final Sanity Check

Before pressing Submit:

- GitHub repository is public.
- Kaggle write-up is submitted, not left as draft.
- Video is public and viewable without login.
- Repository link points to the final pushed commit.
- Write-up says model weights are not redistributed.
- Write-up explains how judges download the official model and reproduce the demo.
- No private lecture files, local paths, API keys, keystores, or model binaries are committed.
