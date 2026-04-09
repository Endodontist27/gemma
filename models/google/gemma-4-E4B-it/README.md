# Gemma 4 E4B Desktop Demo Model

This folder is the repo-local target for the desktop competition demo model.

- Base model: `google/gemma-4-E4B-it`
- Intended runtime: local desktop GPU on an RTX 3060 12 GB class machine
- Default quantization profile: bitsandbytes 4-bit NF4
- Optional higher-memory profile: bitsandbytes 8-bit

Model files are intentionally not committed. Download them locally with:

```bash
npm run model:download:desktop
```

Then run the desktop grounded QA harness with:

```bash
npm run model:desktop -- doctor
npm run model:desktop -- answer --question "What is working length?"
```
