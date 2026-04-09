import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(import.meta.dirname, '..', '..');
const androidRoot = path.join(projectRoot, 'android');
const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const gradlePath = path.join(androidRoot, gradleCommand);
const ggufPath = path.join(
  projectRoot,
  'models',
  'google',
  'gemma-4-E2B-it',
  'android',
  'gemma-4-E2B-it-Q3_K_S.gguf',
);

if (!existsSync(gradlePath)) {
  console.error(`Missing Gradle wrapper at ${gradlePath}.`);
  process.exit(1);
}

if (!existsSync(ggufPath)) {
  console.error(
    `Missing GGUF artifact at ${ggufPath}. Run "npm run model:download:android" first.`,
  );
  process.exit(1);
}

const env = {
  ...process.env,
  APP_ENV: 'production',
  NODE_ENV: 'production',
  LECTURE_COMPANION_BUNDLE_MODEL: 'true',
};

const gradleArgs = [
  'app:assembleQa',
  '-PlectureCompanion.bundleGemmaModel=true',
  '-PreactNativeArchitectures=arm64-v8a',
];

const result = spawnSync(gradlePath, gradleArgs, {
  cwd: androidRoot,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const apkPath = path.join(
  androidRoot,
  'app',
  'build',
  'outputs',
  'apk',
  'qa',
  'app-qa.apk',
);

console.warn(`Standalone QA APK ready at ${apkPath}`);
