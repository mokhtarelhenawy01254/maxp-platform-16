/**
 * @module pipeline
 * @description Executes a sequence of composable stages, passing context between them.
 *
 * Each stage is an async function that receives a context object and returns
 * a modified context. If a stage returns { earlyReturn: ... }, the pipeline
 * stops immediately and returns that result.
 */

/**
 * Execute a pipeline of stages sequentially.
 * @param {Object} context - Initial context object
 * @param {Function[]} stages - Array of async stage functions
 * @returns {Promise<Object>} Final context after all stages
 */
async function execute(context, stages) {
  let ctx = context;

  for (const stage of stages) {
    ctx = await stage(ctx);

    if (ctx && ctx.earlyReturn) {
      return ctx;
    }
  }

  return ctx;
}

module.exports = { execute };
