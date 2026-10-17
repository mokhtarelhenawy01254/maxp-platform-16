#!/usr/bin/env node

/**
 * update-course1-thumbnail.js
 *
 * Idempotently updates course 1 (cmuzmwaxs07r2juml2v04xon5) with the official
 * 1080x1080 branded course-path thumbnail image.
 */

const { getSharedPrismaClientAsync, closeSharedDatabase } = require('../services/sharedDatabase');

async function main() {
  console.log('🖼️ [update-course1-thumbnail] Updating Course 1 thumbnailUrl...');
  const prisma = await getSharedPrismaClientAsync();
  const courseId = 'cmuzmwaxs07r2juml2v04xon5';
  const targetThumbnail = 'https://maxp.online/og/p1_course-path_1080x1080.png';

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, thumbnailUrl: true },
  });

  if (!course) {
    console.log(`ℹ️ [update-course1-thumbnail] Course ${courseId} not found in database.`);
    await closeSharedDatabase();
    return;
  }

  console.log(`ℹ️ [update-course1-thumbnail] Current thumbnail: ${course.thumbnailUrl}`);

  if (course.thumbnailUrl !== targetThumbnail) {
    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { thumbnailUrl: targetThumbnail },
      select: { id: true, title: true, thumbnailUrl: true },
    });
    console.log(`✅ [update-course1-thumbnail] Updated successfully to: ${updated.thumbnailUrl}`);
  } else {
    console.log('✅ [update-course1-thumbnail] Thumbnail is already up to date.');
  }

  await closeSharedDatabase();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ [update-course1-thumbnail] Failed:', err);
    process.exit(1);
  });
}

module.exports = { main };
