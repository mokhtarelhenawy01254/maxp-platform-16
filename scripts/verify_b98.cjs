const fs = require('fs');

const files = [
  'apps/frontend/src/pages/academy/AcademyCatalogPage.tsx',
  'apps/frontend/src/pages/academy/AcademyCoursesPage.tsx',
  'apps/frontend/src/pages/academy/AcademyCourseEditorPage.tsx',
  'apps/frontend/src/pages/academy/AcademyStudentsPage.tsx',
  'apps/frontend/src/pages/academy/AcademyLessonViewerPage.tsx',
  'apps/frontend/src/pages/academy/AcademyEnrollModal.tsx',
  'apps/frontend/src/pages/academy/AcademyMyCoursesTab.tsx',
  'apps/frontend/src/pages/academy/AcademyCreateCourseModal.tsx',
  'apps/frontend/src/pages/academy/AcademySyncOrderModal.tsx',
  'apps/frontend/src/pages/academy/AcademyCourseSettingsModal.tsx',
  'apps/frontend/src/pages/academy/AcademyLessonModal.tsx',
  'apps/frontend/src/pages/academy/AcademyQuizModal.tsx',
  'apps/frontend/src/pages/academy/AcademyAddModuleModal.tsx',
  'apps/frontend/src/pages/academy/AcademyModuleList.tsx',
  'apps/frontend/src/pages/academy/AcademyManualEnrollModal.tsx',
  'apps/frontend/src/pages/academy/AcademyStudentsKpiBar.tsx',
  'apps/frontend/src/pages/academy/AcademyStudentsTable.tsx',
  'apps/frontend/src/pages/academy/AcademyStudentsSubmissionsTab.tsx',
  'apps/frontend/src/pages/academy/DynamicVideoWatermark.tsx',
  'apps/frontend/src/pages/academy/AcademyLessonSidebar.tsx',
  'apps/frontend/src/pages/academy/AcademyLessonQuizView.tsx',
  'apps/frontend/src/pages/academy/AcademyLessonExerciseView.tsx',
  'apps/frontend/src/pages/academy/AcademyLessonAiCoachDrawer.tsx',
  'apps/frontend/src/pages/academy/AcademyVideoPlayerSection.tsx',
  'apps/frontend/src/pages/academy/AcademyLessonTopBar.tsx',
  'apps/frontend/src/pages/academy/AcademyLessonScriptTab.tsx',
];

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

let failed = false;

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.error(`File missing: ${f}`);
    failed = true;
    continue;
  }
  const content = fs.readFileSync(f, 'utf8');
  const lineCount = content.split('\n').length;
  console.log(`${f}: ${lineCount} lines`);
  if (lineCount > 400) {
    console.error(`ERROR: ${f} exceeds 400 lines (${lineCount})`);
    failed = true;
  }

  // Check emojis
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (emojiRegex.test(l)) {
      console.error(`EMOJI found in ${f}:${idx+1} -> ${l.trim()}`);
      failed = true;
    }
  });
}

if (failed) {
  console.error("Verification FAILED!");
  process.exit(1);
} else {
  console.log("All Batch 98 files passed line count and emoji checks!");
}
