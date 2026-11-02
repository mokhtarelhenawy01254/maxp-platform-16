import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveResumeState, RESUME_STATUS } from '../resumeConfirmation.ts';

test('confirms resume only when the server sync succeeded', () => {
  const state = resolveResumeState({ syncOk: true, wasPaused: true });
  assert.equal(state.status, RESUME_STATUS.CONFIRMED);
  assert.equal(state.isPaused, false);
  assert.equal(state.showResumeButton, false);
  assert.equal(state.message, null);
});

test('falls back to a paused state with a retry button when sync fails', () => {
  const state = resolveResumeState({ syncOk: false, wasPaused: true });
  assert.equal(state.status, RESUME_STATUS.FAILED);
  assert.equal(state.isPaused, true);
  assert.equal(state.showResumeButton, true);
  assert.match(String(state.message), /تعذّر تأكيد الاستئناف/);
});

test('surfaces the server error text', () => {
  const state = resolveResumeState({ syncOk: false, error: 'ECONNRESET', wasPaused: true });
  assert.match(String(state.message), /ECONNRESET/);
});

test('never shows a resume button when the session was not paused', () => {
  const state = resolveResumeState({ syncOk: true, wasPaused: false });
  assert.equal(state.isPaused, false);
  assert.equal(state.showResumeButton, false);
});

test('treats a missing syncOk flag as failure, not success', () => {
  const state = resolveResumeState({ wasPaused: true });
  assert.equal(state.status, RESUME_STATUS.FAILED);
  assert.equal(state.isPaused, true);
});
