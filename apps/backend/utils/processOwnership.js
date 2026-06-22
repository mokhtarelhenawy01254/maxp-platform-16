function getProcessInstanceId(env = process.env) {
  return env.NODE_APP_INSTANCE ?? env.PM2_INSTANCE_ID ?? env.INSTANCE_ID ?? null;
}

function shouldOwnSingletonWork(env = process.env) {
  if (env.MAXP_SINGLETON_OWNER === "false") return false;
  if (env.MAXP_SINGLETON_OWNER === "true") return true;

  const instanceId = getProcessInstanceId(env);
  return instanceId === null || instanceId === "" || instanceId === "0";
}

module.exports = {
  getProcessInstanceId,
  shouldOwnSingletonWork,
};
