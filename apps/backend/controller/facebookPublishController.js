const { getSharedPrismaClient } = require('../services/sharedDatabase');
const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');
const { ensureValidFacebookPageAccessToken } = require('../utils/facebookPageTokenUtils');

const createPost = async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.companyId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const {
            pageIds,
            message,
            mediaUrls,
            mediaType,
            linkUrl,
            postType,
            scheduledTime
        } = req.body;

        if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Please select at least one page' });
        }

        const results = [];
        const prisma = getSharedPrismaClient();

        const pages = await prisma.facebookPage.findMany({
            where: {
                pageId: { in: pageIds },
                companyId: user.companyId
            }
        });

        const API_VER = getMetaGraphApiVersion();

        for (const page of pages) {
            try {
                const tokenResult = await ensureValidFacebookPageAccessToken({
                    companyId: user.companyId,
                    pageId: page.pageId,
                    pageAccessToken: page.pageAccessToken,
                    allowRefresh: true,
                });

                if (!tokenResult.ok) {
                    const fbErr = tokenResult.validation?.error;
                    console.error(`❌ [FACEBOOK-PUBLISH] Token invalid for ${page.pageName}:`, fbErr?.message || tokenResult);
                    results.push({
                        pageId: page.pageId,
                        pageName: page.pageName,
                        success: false,
                        error: fbErr?.message || 'Page access token is invalid or expired',
                    });
                    continue;
                }

                const pageAccessToken = tokenResult.pageAccessToken;
                let payload = { access_token: pageAccessToken };

                if (scheduledTime) {
                    const publishTime = new Date(scheduledTime).getTime() / 1000;
                    payload.published = false;
                    payload.scheduled_publish_time = Math.round(publishTime);
                }

                let response;

                if (postType === 'STORY') {
                    if (mediaType === 'VIDEO' && mediaUrls && mediaUrls.length > 0) {
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/video_stories`;
                        payload.file_url = mediaUrls[0];
                        response = await axios.post(endpoint, payload);
                    } else if (mediaUrls && mediaUrls.length > 0) {
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/photo_stories`;
                        payload.url = mediaUrls[0];
                        response = await axios.post(endpoint, payload);
                    } else {
                        throw new Error('Stories require a media file (Image or Video).');
                    }
                } else {
                    if (linkUrl) {
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/feed`;
                        payload.link = linkUrl;
                        if (message) payload.message = message;
                        response = await axios.post(endpoint, payload);
                    } else if (mediaType === 'VIDEO' && mediaUrls && mediaUrls.length > 0) {
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/videos`;
                        payload.file_url = mediaUrls[0];
                        if (message) payload.description = message;
                        response = await axios.post(endpoint, payload);
                    } else if (mediaUrls && mediaUrls.length > 1) {
                        const mediaIds = [];
                        for (const url of mediaUrls) {
                            const photoEndpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/photos`;
                            const photoPayload = { access_token: pageAccessToken, url, published: false };
                            const photoRes = await axios.post(photoEndpoint, photoPayload);
                            if (photoRes.data.id) mediaIds.push(photoRes.data.id);
                        }
                        const feedEndpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/feed`;
                        payload.message = message || '';
                        payload.attached_media = mediaIds.map(id => ({ media_fbid: id }));
                        response = await axios.post(feedEndpoint, payload);
                    } else if (mediaUrls && mediaUrls.length === 1) {
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/photos`;
                        payload.url = mediaUrls[0];
                        if (message) payload.caption = message;
                        response = await axios.post(endpoint, payload);
                    } else {
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/feed`;
                        if (message) payload.message = message;
                        response = await axios.post(endpoint, payload);
                    }
                }

                const postId = response?.data?.id || response?.data?.post_id;
                console.log(`✅ [FACEBOOK-PUBLISH] Posted to ${page.pageName}:`, postId);
                results.push({
                    pageId: page.pageId,
                    pageName: page.pageName,
                    success: true,
                    postId,
                });

            } catch (error) {
                const fbData = error.response?.data;
                const fbError = fbData?.error;
                console.error(`❌ [FACEBOOK-PUBLISH] Error posting to ${page.pageName}:`, JSON.stringify(fbData || error.message));
                results.push({
                    pageId: page.pageId,
                    pageName: page.pageName,
                    success: false,
                    error: fbError?.message || fbError?.error_user_msg || error.message || 'An unknown error occurred',
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        res.json({
            success: true,
            message: `Processed ${successCount}/${totalCount} pages`,
            results,
        });

    } catch (error) {
        console.error('❌ [FACEBOOK-PUBLISH] General error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { createPost };
