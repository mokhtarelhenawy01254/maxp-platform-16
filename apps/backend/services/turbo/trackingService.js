const axios = require('axios');
const { handleError, getTurboErrorMessage } = require('../../utils/turbo/errorHandler');
const { TURBO_STATUS_CODE_MAP } = require('../../utils/turbo/constants');
const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');

class TrackingService {
  constructor(apiClient, companyId = null) {
    this._client = apiClient;
    this.companyId = companyId;
  }

  async trackShipment(trackingNumber) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const trackingNumberStr = String(trackingNumber || '');

      try {
        const searchResponse = await axios.post(`${this._client.baseUrl}/search-order`, { authentication_key: apiKey, main_client_code: mainClientCode || 37321, search_key: trackingNumberStr }, { headers, timeout: this._client.timeout });
        const searchData = searchResponse.data;
        console.log(`🔍 [TURBO-TRACK] search-order for ${trackingNumberStr}: success=${searchData?.success}, hasResult=${!!searchData?.result}, hasData=${!!searchData?.data}`);
        const searchItems = searchData?.result || searchData?.data;
        if (searchData && (searchData.success === 1 || searchData.success === true) && searchItems) {
          const shipment = Array.isArray(searchItems) ? searchItems[0] : searchItems;
          if (shipment) return { success: true, data: { code: trackingNumberStr, status: shipment.status || shipment.status_text || 'created', status_code: shipment.status_code || null, internalStatus: shipment.status || shipment.status_text || 'created', raw: shipment } };
        }
        return { success: false, error: 'Shipment not found in Turbo' };
      } catch (searchErr) {
        console.warn(`⚠️ [TURBO-TRACK] search-order failed for ${trackingNumberStr}:`, searchErr.response?.status, searchErr.response?.data?.message || searchErr.message);
      }

      const today = new Date().toISOString().split('T')[0];
      const from90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      try {
        const statusResp = await axios.post(`${this._client.baseUrl}/get-status`, { authentication_key: apiKey, main_client_code: mainClientCode || 37321, from: from90, to: today }, { headers, timeout: this._client.timeout });
        const found = (statusResp.data?.data || []).find(s => String(s.code) === trackingNumberStr || String(s.bar_code) === trackingNumberStr || String(s.invoice_number) === trackingNumberStr);
        if (found) return { success: true, data: { code: found.code, status: found.status, status_code: found.status_code, internalStatus: found.status, raw: found } };
      } catch (statusErr) {
        console.warn(`⚠️ [TURBO-TRACK] get-status fallback failed for ${trackingNumberStr}:`, statusErr.response?.status, statusErr.response?.data?.message || statusErr.message);
      }

      return { success: false, error: 'Shipment not found in Turbo خلال آخر 90 يوم' };
    } catch (outerErr) {
      return { success: false, error: outerErr.message || 'Unknown error', trackingNumber: String(trackingNumber || ''), status: null, currentLocation: null, estimatedDelivery: null, history: [], data: null };
    }
  }

  async getShipmentStatus(shipmentId) {
    try {
      const headers = await this._client.getHeaders();
      const response = await axios.get(`${this._client.baseUrl}/shipments/${shipmentId}`, { headers, timeout: this._client.timeout });
      const shipment = response.data;
      return { success: true, shipmentId: shipment.id || shipment.shipment_id, status: shipment.status, trackingNumber: shipment.tracking_number, currentLocation: shipment.current_location || null, estimatedDelivery: shipment.estimated_delivery || null, deliveredAt: shipment.delivered_at || null, data: shipment };
    } catch (error) {
      handleError(error, 'Get Shipment Status');
    }
  }

  async fetchAllStatuses(fromDate, toDate) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const today = new Date();
      const ninetyDaysAgo = new Date(today); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const from = fromDate || ninetyDaysAgo.toISOString().split('T')[0];
      const to = toDate || today.toISOString().split('T')[0];
      const response = await axios.post(`${this._client.baseUrl}/get-status`, { authentication_key: apiKey, main_client_code: mainClientCode || 37321, from, to }, { headers, timeout: this._client.timeout });
      const result = response.data;
      if (result.success === 0 || result.success === false) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      const shipments = Array.isArray(result.data) ? [...result.data] : [];

      // 📊 DIAGNOSTIC: Log status distribution from get-status
      const statusDist = {};
      shipments.forEach(s => {
        const code = String(s.status_code || '?');
        const text = s.status || '?';
        const key = `${code}(${text})`;
        statusDist[key] = (statusDist[key] || 0) + 1;
      });
      console.log(`📊 [TURBO-GETSTATUS] Returned ${shipments.length} orders. Distribution:`, JSON.stringify(statusDist));

      // 🚨 Turbo API /get-status returns only ~20 records (first page, no pagination).
      // Fetch remaining non-terminal orders in CONCURRENT batches via /search-order.
      if (this.companyId && shipments.length > 0) {
        const batchCodes = new Set(shipments.map(s => s.code).filter(Boolean));
        try {
          const prisma = getSharedPrismaClient();
          const [dbOrders, dbGuestOrders] = await Promise.all([
            safeQuery(() =>
              prisma.order.findMany({
                where: {
                  companyId: this.companyId,
                  turboShipmentId: { not: null },
                  turboShipmentStatus: { notIn: ['delivered', 'cancelled', 'returned', 'remitted', 'archived'] }
                },
                select: { turboShipmentId: true, turboTrackingNumber: true },
                // 🚨 PRODUCTION-FIX (turbo-sync-rotation): الأقدم تحديثًا أولى — كده
                // كل جولة (كل 30 دقيقة) بتغطي دفعة مختلفة من العالق بدل ما نفس
                // الأحدث بيتفحص كل مرة والقديم يفضل محبوس (172 أوردر created).
                orderBy: { updatedAt: 'asc' },
                take: 150
              }), 3
            ).catch(() => []),
            safeQuery(() =>
              prisma.guestOrder.findMany({
                where: {
                  companyId: this.companyId,
                  turboShipmentId: { not: null },
                  turboShipmentStatus: { notIn: ['delivered', 'cancelled', 'returned', 'remitted', 'archived'] }
                },
                select: { turboShipmentId: true, turboTrackingNumber: true },
                orderBy: { updatedAt: 'asc' },
                take: 150
              }), 3
            ).catch(() => [])
          ]);

          const allDbCandidates = [...(dbOrders || []), ...(dbGuestOrders || [])];
          // ☁️ Cloudflare WAF على backoffice.turbo-eg.com بيحظر بـ 429 عند الطلبات
          // المتلاحقة — قللنا حجم الجولة (60 بدل 100) والتزامن (2 بدل 5) مع
          // pacing بين الدفعات وbackoff عند 429. 60/30 دقيقة = ~2,880 كود/يوم.
          const codesToFetch = allDbCandidates
            .map(o => o.turboShipmentId || o.turboTrackingNumber)
            .filter(c => c && !batchCodes.has(c))
            .slice(0, 60);

          if (codesToFetch.length > 0) {
            const CONCURRENCY = 2;
            const is429 = (s) => s.status === 'rejected' && (s.reason?.response?.status === 429 || s.reason?.response?.data?.message?.includes('Too Many'));
            const searchOne = (code) => axios.post(`${this._client.baseUrl}/search-order`, {
              authentication_key: apiKey,
              main_client_code: mainClientCode || 37321,
              search_key: String(code)
            }, { headers, timeout: this._client.timeout });
            const results = [];
            let aborted429 = false;
            for (let i = 0; i < codesToFetch.length; i += CONCURRENCY) {
              const batch = codesToFetch.slice(i, i + CONCURRENCY);
              if (i > 0) await new Promise(r => setTimeout(r, 300)); // pacing بين الدفعات
              let settled = await Promise.allSettled(batch.map(searchOne));
              if (settled.some(is429)) {
                // Backoff: مهلة 3 ثوان ومحاولة واحدة إضافية للدفعة
                await new Promise(r => setTimeout(r, 3000));
                settled = await Promise.allSettled(batch.map(searchOne));
                if (settled.some(is429)) {
                  console.warn(`☁️ [TURBO-GETSTATUS] Cloudflare 429 persists — stopping this run early (${i}/${codesToFetch.length} fetched). Next run continues from oldest.`);
                  aborted429 = true;
                }
              }
              if (aborted429) break;
              for (let j = 0; j < settled.length; j++) {
                const s = settled[j];
                if (s.status === 'fulfilled') {
                  const item = s.value.data?.result?.[0];
                  if (item) {
                    shipments.push(item);
                    results.push(batch[j]);
                  }
                }
              }
            }
            if (results.length > 0) {
              console.log(`📊 [TURBO-GETSTATUS] Fetched ${results.length} additional orders concurrently via /search-order. Total: ${shipments.length}${aborted429 ? ' (aborted early on 429)' : ''}`);
            }
          }
        } catch (_) { /* DB fallback: continue with batch results only */ }
      }

      return {
        success: true,
        shipments: shipments.map(s => {
          const rawStatus = (s.status || '').trim();
          const statusCodeStr = String(s.status_code || '');
          const mapped = TURBO_STATUS_CODE_MAP[rawStatus] || TURBO_STATUS_CODE_MAP[rawStatus.toLowerCase()] || TURBO_STATUS_CODE_MAP[statusCodeStr] || (rawStatus ? rawStatus.toLowerCase() : 'turbo_saved');
          return { code: s.code, barCode: s.bar_code, status: s.status, statusCode: s.status_code, internalStatus: mapped, returnReason: s.return_reason, delayReason: s.delay_reason, branch: s.branch, captain: s.captain, captainNumber1: s.captain_number1, captainNumber2: s.captain_number2, receivedAmount: s.received_amount, expectedBranch: s.expected_branch, invoiceNumber: s.invoice_number, returnedInventoryStatus: s.returned_inventory_status, raw: s };
        }),
        count: shipments.length,
        dateRange: { from, to }
      };
    } catch (error) {
      handleError(error, 'Fetch All Statuses');
    }
  }
}

module.exports = TrackingService;
