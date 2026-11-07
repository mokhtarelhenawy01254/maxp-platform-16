/**
 * 1e422c5a — dependency-free contract test for the missing-punches daily cron.
 *
 * The shared install has no node_modules, so this test stubs node-cron and the two
 * service modules through Module._load and exercises runOnce() twice: once with a
 * failing company (the day must stay retryable) and once all-green (the day is burnt).
 *
 * Run: node tests/missingPunchesCronRetry.test.js
 */
const assert = require('assert');
const Module = require('module');

const companies = [
  { id: 'c1', name: 'Company One' },
  { id: 'c2', name: 'Company Two' },
];
let failCompanyTwo = false;
const calls = [];

const fakePrisma = { company: { findMany: async () => companies } };
const fakeAttendance = {
  checkDailyMissingPunches: async (companyId) => {
    calls.push(companyId);
    if (failCompanyTwo && companyId === 'c2') throw new Error('boom');
    return { missingCount: 0 };
  },
};

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'node-cron') return { schedule: () => {} };
  if (request.endsWith('services/sharedDatabase')) return { getSharedPrismaClient: () => fakePrisma };
  if (request.endsWith('services/hr/attendanceService')) return fakeAttendance;
  return origLoad.apply(this, arguments);
};

const cron = require('../cron/missingPunchesDailyCron');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n += 1; };

(async () => {
  // 1) a single failing company must NOT burn the day
  failCompanyTwo = true;
  const r1 = await cron.runOnce();
  ok(r1.failed === 1, 'one company reported as failed');
  ok(r1.failedCompanies.length === 1 && r1.failedCompanies[0] === 'Company Two', 'failing company is named');
  ok(cron.lastRunDate === null, 'lastRunDate stays null when a company failed');

  const before = calls.length;
  const r2 = await cron.runOnce();
  ok(r2.skipped === undefined, 'a later run the same day is not skipped');
  ok(calls.length === before + 2, 'retry re-checks every company');

  // 2) all green burns the day and blocks a same-day re-run
  failCompanyTwo = false;
  const r3 = await cron.runOnce();
  ok(r3.failed === 0, 'clean run reports zero failures');
  ok(Boolean(cron.lastRunDate), 'lastRunDate set after a clean run');
  const r4 = await cron.runOnce();
  ok(r4.skipped === true && r4.reason === 'already_ran_today', 'same-day re-run is skipped after a clean run');

  console.log(`PASS missingPunchesCronRetry — ${n} assertions`);
})().catch((e) => {
  console.error('FAIL', e && e.message);
  process.exit(1);
});
