import { config } from '../config/env.js';

/**
 * Sends a webhook payload to the configured Google Apps Script Web App
 */
async function sendToGoogleSheets(action, data) {
  const webhookUrl = config.googleSheets.webhookUrl;
  const secret = config.googleSheets.secret;

  if (!webhookUrl) {
    console.info(`[GoogleSheets] Webhook URL not configured. Skipped sync for action: ${action}`);
    return { success: false, skipped: true, message: 'Google Sheets webhook URL not configured' };
  }

  const payload = {
    action,
    secret,
    data,
    timestamp: new Date().toISOString()
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GoogleSheets] Webhook responded with status ${response.status}: ${errorText}`);
      return { success: false, status: response.status, error: errorText };
    }

    const result = await response.json();
    console.info(`[GoogleSheets] Action ${action} synchronized successfully.`, result);
    return { success: true, result };
  } catch (err) {
    console.error(`[GoogleSheets] Failed to sync ${action}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

export const sheetsService = {
  /**
   * Sync customer registration or profile update
   */
  async syncCustomer(customer) {
    return sendToGoogleSheets('SYNC_CUSTOMER', customer);
  },

  /**
   * Sync newly placed order
   */
  async syncOrder(order) {
    return sendToGoogleSheets('SYNC_ORDER', order);
  },

  /**
   * Sync order status update
   */
  async updateOrderStatus(orderId, status, paymentStatus) {
    return sendToGoogleSheets('UPDATE_ORDER_STATUS', {
      order_id: orderId,
      status,
      payment_status: paymentStatus
    });
  },

  /**
   * Check connection to Google Apps Script
   */
  async healthCheck() {
    return sendToGoogleSheets('HEALTH_CHECK', {});
  }
};
