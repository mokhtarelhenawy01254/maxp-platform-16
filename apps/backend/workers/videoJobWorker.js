/**
 * Video job worker: claims QUEUED VideoJob rows atomically (safe across the two
 * backend instances), drives them through the provider adapter, downloads outputs
 * to local storage (Higgsfield deletes outputs after ~7 days), extracts poster +
 * last frame via ffmpeg, and advances story scenes / character sheets on completion.
 *
 * Started from server.js next to the other workers; guarded by the same process
 * role checks (only instances running crons/schedulers start it).
 */
const fsPromises = require('fs').promises;
const path = require('path');
const videoStudioService = require('../services/videoStudioService');
const videoCharacterService = require('../services/videoCharacterService');
const videoStoryService = require('../services/videoStoryService');
const higgsfieldAdapter = require('../services/videoProviders/higgsfieldAdapter');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const TICK_MS = 10_000;
const MAX_CONCURRENT = 2;
const POLL_INTERVAL_MS = 6_000;
const MAX_POLL_MINUTES = 15;
const STUCK_PROCESSING_MINUTES = 20;

let timer = null;
const active = new Set();

function outputDir(companyId) {
  return path.join(__dirname, '../uploads/video_studio', String(companyId || 'default'));
}

function publicUrl(companyId, fileName) {
  return `/uploads/video_studio/${companyId}/${fileName}`;
}

async function claimNextJob() {
  const prisma = getSharedPrismaClient();
  const candidates = await prisma.videoJob.findMany({
    where: { status: 'QUEUED' },
    orderBy: { createdAt: 'asc' },
    take: 5,
    select: { id: true },
  });
  for (const candidate of candidates) {
    if (active.has(candidate.id)) continue;
    // Atomic claim: only flips if still QUEUED (another instance loses the race)
    const claimed = await prisma.videoJob.updateMany({
      where: { id: candidate.id, status: 'QUEUED' },
      data: { status: 'PROCESSING', progress: 5 },
    });
    if (claimed.count === 1) return candidate.id;
  }
  return null;
}

async function isCancelRequested(jobId) {
  const prisma = getSharedPrismaClient();
  const row = await prisma.videoJob.findUnique({
    where: { id: jobId },
    select: { status: true, providerMeta: true },
  });
  if (!row) return true; // job vanished — stop processing
  if (row.status === 'CANCELLED') return true;
  return Boolean(row.providerMeta?.cancelRequested);
}

async function finalizeWithLocalOutput(job, localFileName, providerMeta) {
  const prisma = getSharedPrismaClient();
  const dir = outputDir(job.companyId);
  const baseName = path.basename(localFileName, path.extname(localFileName));
  const ext = path.extname(localFileName);
  const isVideo = ext === '.mp4' || ext === '.webm' || ext === '.mov';

  const outputUrl = publicUrl(job.companyId, localFileName);
  let posterUrl = null;
  let lastFrameUrl = null;

  if (isVideo) {
    try {
      const posterName = `${baseName}_poster.jpg`;
      await higgsfieldAdapter.extractPoster({
        videoPath: path.join(dir, localFileName),
        posterPath: path.join(dir, posterName),
      });
      posterUrl = publicUrl(job.companyId, posterName);
    } catch (e) {
      console.warn(`⚠️ [VIDEO-WORKER] poster extraction failed: ${e.message}`);
    }
    try {
      const lastFrameName = `${baseName}_last.jpg`;
      await higgsfieldAdapter.extractLastFrame({
        videoPath: path.join(dir, localFileName),
        lastFramePath: path.join(dir, lastFrameName),
      });
      lastFrameUrl = publicUrl(job.companyId, lastFrameName);
    } catch (e) {
      console.warn(`⚠️ [VIDEO-WORKER] last-frame extraction failed: ${e.message}`);
    }
  }

  const updated = await prisma.videoJob.update({
    where: { id: job.id },
    data: {
      status: 'COMPLETED',
      progress: 100,
      outputUrl,
      outputPosterUrl: posterUrl,
      lastFrameUrl,
      providerMeta: { ...(job.providerMeta || {}), ...providerMeta },
      errorMessage: null,
    },
  });

  if (job.type === 'CHARACTER_SHEET') {
    await videoCharacterService.onSheetJobCompleted(updated).catch((e) =>
      console.error(`❌ [VIDEO-WORKER] character sheet attach failed: ${e.message}`)
    );
  }
  await videoStoryService.onSceneJobFinished(updated).catch((e) =>
    console.error(`❌ [VIDEO-WORKER] story advance failed: ${e.message}`)
  );
  console.log(`✅ [VIDEO-WORKER] Job ${job.id} COMPLETED → ${outputUrl}`);
  return updated;
}

async function failJob(job, reason, refund = true) {
  const prisma = getSharedPrismaClient();
  const updated = await prisma.videoJob.update({
    where: { id: job.id },
    data: {
      status: 'FAILED',
      errorMessage: String(reason).slice(0, 1000),
      providerMeta: { ...(job.providerMeta || {}), failedAt: new Date().toISOString() },
    },
  });
  if (refund && updated.billingMode === 'PLATFORM' && Number(updated.chargedEgp) > 0) {
    await videoStudioService.refundCharge(updated, 'فشل التوليد').catch((e) =>
      console.error(`❌ [VIDEO-WORKER] refund failed: ${e.message}`)
    );
  }
  await videoStoryService.onSceneJobFinished(updated).catch(() => {});
  console.error(`❌ [VIDEO-WORKER] Job ${job.id} FAILED: ${reason}`);
  return updated;
}

async function processJob(jobId) {
  const prisma = getSharedPrismaClient();
  let job = await prisma.videoJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'PROCESSING') return;

  try {
    const [settings, keyInfo] = await Promise.all([
      videoStudioService.getSettings(),
      videoStudioService.resolveKeys(job.companyId),
    ]);
    const dir = outputDir(job.companyId);
    await fsPromises.mkdir(dir, { recursive: true });

    const submitResult = await higgsfieldAdapter.submit({
      model: job.model,
      type: job.type,
      params: job.params,
      apiKey: keyInfo.apiKey,
      settings,
      jobId: job.id,
      outputDir: dir,
    });

    job = await prisma.videoJob.update({
      where: { id: job.id },
      data: {
        providerRequestId: submitResult.requestId,
        statusUrl: submitResult.statusUrl,
        progress: 15,
        providerMeta: { ...(job.providerMeta || {}), simulated: submitResult.simulated },
      },
    });

    // Simulation path: produce the local clip immediately
    if (submitResult.simulated) {
      await prisma.videoJob.update({ where: { id: job.id }, data: { progress: 70 } });
      const isImageJob = job.type === 'CHARACTER_SHEET' || job.type === 'TEXT_TO_IMAGE';
      if (isImageJob) {
        const simImage = await higgsfieldAdapter.produceSimulationImage({ jobId: job.id, outputDir: dir });
        const imageUrl = publicUrl(job.companyId, path.basename(simImage.localPath));
        const imageJob = await prisma.videoJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            progress: 100,
            outputUrl: imageUrl,
            providerMeta: { ...(job.providerMeta || {}), simulated: true, outputAssets: [imageUrl] },
          },
        });
        if (job.type === 'CHARACTER_SHEET') {
          await videoCharacterService.onSheetJobCompleted(imageJob).catch((e) =>
            console.error(`❌ [VIDEO-WORKER] character sheet attach failed: ${e.message}`)
          );
        }
        console.log(`✅ [VIDEO-WORKER] Simulated image job ${job.id} COMPLETED → ${imageUrl}`);
        return;
      }
      const duration = Number(job.params?.durationSeconds) || 5;
      const sim = await higgsfieldAdapter.produceSimulationOutput({
        jobId: job.id,
        outputDir: dir,
        durationSeconds: duration,
      });
      await finalizeWithLocalOutput(job, path.basename(sim.localPath), { simulated: true });
      return;
    }

    // Live path: poll until terminal
    const maxAttempts = Math.ceil((MAX_POLL_MINUTES * 60 * 1000) / POLL_INTERVAL_MS);
    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      if (await isCancelRequested(job.id)) {
        await higgsfieldAdapter.cancel({ cancelUrl: submitResult.cancelUrl, apiKey: keyInfo.apiKey, settings });
        const cancelled = await prisma.videoJob.update({ where: { id: job.id }, data: { status: 'CANCELLED' } });
        if (Number(cancelled.chargedEgp) > 0 && cancelled.billingMode === 'PLATFORM') {
          await videoStudioService.refundCharge(cancelled, 'إلغاء أثناء التنفيذ').catch(() => {});
        }
        await videoStoryService.onSceneJobFinished(cancelled).catch(() => {});
        console.log(`🛑 [VIDEO-WORKER] Job ${job.id} CANCELLED`);
        return;
      }

      const status = await higgsfieldAdapter.pollStatus({
        statusUrl: submitResult.statusUrl,
        apiKey: keyInfo.apiKey,
        settings,
      });

      if (status.progress > 0) {
        await prisma.videoJob.update({
          where: { id: job.id },
          data: { progress: Math.min(95, Math.max(15, status.progress)) },
        }).catch(() => {});
      }

      if (status.status === 'COMPLETED') {
        const outputs = status.outputs;
        if (!outputs || outputs.length === 0) {
          await failJob(job, 'المزود أنهى المهمة بدون مخرجات');
          return;
        }
        // Download first output (video) or all outputs (image sheets)
        if (job.type === 'CHARACTER_SHEET' || job.type === 'TEXT_TO_IMAGE') {
          const downloaded = [];
          for (let i = 0; i < Math.min(4, outputs.length); i++) {
            const fileName = `${job.id}_${i}${path.extname(new URL(outputs[i]).pathname) || '.png'}`;
            await higgsfieldAdapter.downloadOutput({ url: outputs[i], apiKey: keyInfo.apiKey, destPath: path.join(dir, fileName) });
            downloaded.push(publicUrl(job.companyId, fileName));
          }
          const prisma2 = getSharedPrismaClient();
          const sheetJob = await prisma2.videoJob.update({
            where: { id: job.id },
            data: { outputUrl: downloaded[0], status: 'COMPLETED', progress: 100, providerMeta: { ...(job.providerMeta || {}), outputAssets: downloaded } },
          });
          await videoCharacterService.onSheetJobCompleted(sheetJob).catch(() => {});
          console.log(`✅ [VIDEO-WORKER] Image job ${job.id} COMPLETED (${downloaded.length} assets)`);
          return;
        }
        const fileName = `${job.id}${path.extname(new URL(outputs[0]).pathname) || '.mp4'}`;
        await higgsfieldAdapter.downloadOutput({ url: outputs[0], apiKey: keyInfo.apiKey, destPath: path.join(dir, fileName) });
        await finalizeWithLocalOutput(job, fileName, {});
        return;
      }

      if (status.status === 'FAILED') {
        await failJob(job, status.error || 'فشل التوليد عند المزود');
        return;
      }
      if (status.status === 'CANCELLED') {
        const cancelled = await prisma.videoJob.update({ where: { id: job.id }, data: { status: 'CANCELLED' } });
        await videoStoryService.onSceneJobFinished(cancelled).catch(() => {});
        return;
      }
    }
    await failJob(job, `انتهت مهلة التوليد (${MAX_POLL_MINUTES} دقيقة)`);
  } catch (err) {
    await failJob(job, err.message || 'خطأ غير متوقع أثناء التنفيذ').catch(() => {});
  }
}

async function reapStuckJobs() {
  const prisma = getSharedPrismaClient();
  const cutoff = new Date(Date.now() - STUCK_PROCESSING_MINUTES * 60 * 1000);
  const stuck = await prisma.videoJob.findMany({
    where: { status: 'PROCESSING', updatedAt: { lt: cutoff } },
    select: { id: true },
  });
  for (const s of stuck) {
    if (active.has(s.id)) continue;
    console.warn(`🧹 [VIDEO-WORKER] reaping stuck job ${s.id}`);
    await failJob({ ...s, providerMeta: {}, billingMode: 'PLATFORM', chargedEgp: 0 }, `توقف التنفيذ لأكثر من ${STUCK_PROCESSING_MINUTES} دقيقة`, false).catch(() => {});
    // refund separately since failJob got a stub without charged amount
    const full = await prisma.videoJob.findUnique({ where: { id: s.id } });
    if (full && Number(full.chargedEgp) > 0 && full.billingMode === 'PLATFORM') {
      await videoStudioService.refundCharge(full, 'وظيفة عالقة').catch(() => {});
    }
  }
}

async function tick() {
  try {
    while (active.size < MAX_CONCURRENT) {
      const jobId = await claimNextJob();
      if (!jobId) break;
      active.add(jobId);
      processJob(jobId).finally(() => active.delete(jobId));
    }
    await reapStuckJobs();
  } catch (e) {
    console.error(`❌ [VIDEO-WORKER] tick error: ${e.message}`);
  }
}

function startVideoJobWorker() {
  if (timer) return;
  console.log('▶️ [VIDEO-WORKER] started (tick 10s, concurrency 2)');
  timer = setInterval(tick, TICK_MS);
  tick().catch(() => {});
}

function stopVideoJobWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('⏹️ [VIDEO-WORKER] stopped');
  }
}

module.exports = { startVideoJobWorker, stopVideoJobWorker, tick, processJob };
