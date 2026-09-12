const DEFAULT_META_GRAPH_API_VERSION = "v26.0";

function getMetaGraphApiVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_META_GRAPH_API_VERSION;
}

function getMetaGraphApiBaseUrl() {
  return `https://graph.facebook.com/${getMetaGraphApiVersion()}`;
}

function getMetaOAuthBaseUrl() {
  return `https://www.facebook.com/${getMetaGraphApiVersion()}`;
}

module.exports = {
  DEFAULT_META_GRAPH_API_VERSION,
  getMetaGraphApiBaseUrl,
  getMetaGraphApiVersion,
  getMetaOAuthBaseUrl,
};
