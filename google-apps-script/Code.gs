/**
 * ============================================================================
 * Google Apps Script for Food Ordering Web Application
 * Webhook handler for syncing Customer Profiles, Orders, and Order Items.
 * ============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Spreadsheet named "Food Ordering Platform Records"
 * 2. Click Extensions > Apps Script
 * 3. Replace all code with this file
 * 4. In Project Settings > Script Properties, add a property:
 *    Key: WEBHOOK_SECRET
 *    Value: <your-secure-random-token> (e.g. food_secret_xyz123)
 * 5. Run the function `initializeSheets()` once manually from the editor to create tabs & headers
 * 6. Click Deploy > New Deployment > Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the Web App URL and set it in your backend's .env as:
 *    GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/.../exec"
 *    GOOGLE_SHEETS_SECRET="<your-secure-random-token>"
 */

// Global configuration
const SHEET_NAMES = {
  CUSTOMERS: 'Customers',
  ORDERS: 'Orders',
  ORDER_ITEMS: 'Order_Items',
  LOGS: 'Sync_Logs'
};

/**
 * Initializes all required sheets and header rows if they do not exist
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Customers Tab
  getOrCreateSheet(ss, SHEET_NAMES.CUSTOMERS, [
    'User ID',
    'Email',
    'Full Name',
    'Phone',
    'Role',
    'Delivery Address',
    'Registered At',
    'Last Synced At'
  ]);

  // 2. Orders Tab
  getOrCreateSheet(ss, SHEET_NAMES.ORDERS, [
    'Order ID',
    'Order Number',
    'Customer Email',
    'Customer Name',
    'Customer Phone',
    'Status',
    'Payment Status',
    'Payment Method',
    'Subtotal',
    'Tax',
    'Delivery Fee',
    'Total Amount',
    'Items Summary',
    'Delivery Address',
    'Created At',
    'Last Synced At'
  ]);

  // 3. Order Items Tab
  getOrCreateSheet(ss, SHEET_NAMES.ORDER_ITEMS, [
    'Order Item ID',
    'Order ID',
    'Order Number',
    'Food Name',
    'Unit Price',
    'Quantity',
    'Subtotal',
    'Created At'
  ]);

  // 4. Logs Tab
  getOrCreateSheet(ss, SHEET_NAMES.LOGS, [
    'Timestamp',
    'Event',
    'Entity ID',
    'Status',
    'Details'
  ]);
}

/**
 * Helper to get or create sheet with styled headers
 */
function getOrCreateSheet(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground('#1e293b');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }
  return sheet;
}

/**
 * HTTP POST entrypoint for Webhook requests
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse(false, 'Missing request body', 400);
    }

    const payload = JSON.parse(e.postData.contents);
    const scriptProperties = PropertiesService.getScriptProperties();
    const expectedSecret = scriptProperties.getProperty('WEBHOOK_SECRET');

    // Secret verification via payload.secret or Authorization header
    const providedSecret = payload.secret;
    if (expectedSecret && providedSecret !== expectedSecret) {
      logSync('AUTH_FAILURE', 'N/A', 'REJECTED', 'Invalid or missing secret key');
      return jsonResponse(false, 'Unauthorized: Invalid secret key', 401);
    }

    const { action, data } = payload;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case 'SYNC_CUSTOMER':
        return syncCustomer(ss, data);

      case 'SYNC_ORDER':
        return syncOrder(ss, data);

      case 'UPDATE_ORDER_STATUS':
        return updateOrderStatus(ss, data);

      case 'HEALTH_CHECK':
        return jsonResponse(true, 'Google Apps Script webhook is online and authenticated', 200);

      default:
        return jsonResponse(false, 'Unknown action: ' + action, 400);
    }
  } catch (err) {
    logSync('ERROR', 'N/A', 'FAILED', err.toString());
    return jsonResponse(false, 'Internal Script Error: ' + err.toString(), 500);
  }
}

/**
 * HTTP GET for health checks / verification
 */
function doGet(e) {
  return jsonResponse(true, 'Food Ordering Google Apps Script Webhook is active.', 200);
}

/**
 * Upsert Customer record (idempotent by User ID)
 */
function syncCustomer(ss, customer) {
  if (!customer || !customer.id) {
    return jsonResponse(false, 'Missing customer id', 400);
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS) || initializeSheets().customers;
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === customer.id) {
      rowIndex = i + 1;
      break;
    }
  }

  const nowStr = new Date().toISOString();
  const rowData = [
    customer.id,
    customer.email || '',
    customer.full_name || '',
    customer.phone || '',
    customer.role || 'customer',
    customer.address || '',
    customer.created_at || nowStr,
    nowStr
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    logSync('SYNC_CUSTOMER', customer.id, 'UPDATED', 'Updated customer ' + customer.email);
  } else {
    sheet.appendRow(rowData);
    logSync('SYNC_CUSTOMER', customer.id, 'INSERTED', 'Appended customer ' + customer.email);
  }

  return jsonResponse(true, 'Customer synced successfully', 200, { customerId: customer.id });
}

/**
 * Upsert Order record & Order items (idempotent by Order ID)
 */
function syncOrder(ss, order) {
  if (!order || !order.id) {
    return jsonResponse(false, 'Missing order id', 400);
  }

  const orderSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
  const data = orderSheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order.id) {
      rowIndex = i + 1;
      break;
    }
  }

  const nowStr = new Date().toISOString();
  const itemsSummary = (order.items || [])
    .map(function(item) { return item.quantity + 'x ' + item.food_name; })
    .join(', ');

  const rowData = [
    order.id,
    order.order_number || '',
    order.customer_email || '',
    order.customer_name || '',
    order.customer_phone || '',
    order.status || 'pending',
    order.payment_status || 'pending',
    order.payment_method || 'cod',
    Number(order.subtotal || 0).toFixed(2),
    Number(order.tax || 0).toFixed(2),
    Number(order.delivery_fee || 0).toFixed(2),
    Number(order.total_amount || 0).toFixed(2),
    itemsSummary,
    order.delivery_address || '',
    order.created_at || nowStr,
    nowStr
  ];

  if (rowIndex > 0) {
    orderSheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    orderSheet.appendRow(rowData);
  }

  // Sync order items
  if (Array.isArray(order.items) && order.items.length > 0) {
    const itemsSheet = ss.getSheetByName(SHEET_NAMES.ORDER_ITEMS);
    order.items.forEach(function(item) {
      itemsSheet.appendRow([
        item.id || Utilities.getUuid(),
        order.id,
        order.order_number || '',
        item.food_name || '',
        Number(item.unit_price || 0).toFixed(2),
        item.quantity || 1,
        Number(item.subtotal || 0).toFixed(2),
        order.created_at || nowStr
      ]);
    });
  }

  logSync('SYNC_ORDER', order.id, 'SUCCESS', 'Order ' + order.order_number + ' synced with ' + (order.items ? order.items.length : 0) + ' items');
  return jsonResponse(true, 'Order synced successfully', 200, { orderId: order.id, orderNumber: order.order_number });
}

/**
 * Updates an existing order's status in the Orders sheet
 */
function updateOrderStatus(ss, updateData) {
  const { order_id, status, payment_status } = updateData;
  if (!order_id || !status) {
    return jsonResponse(false, 'Missing order_id or status', 400);
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === order_id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return jsonResponse(false, 'Order not found in spreadsheet: ' + order_id, 404);
  }

  // Status is column 6 (F), Payment Status is column 7 (G), Last Synced is column 16 (P)
  sheet.getRange(rowIndex, 6).setValue(status);
  if (payment_status) {
    sheet.getRange(rowIndex, 7).setValue(payment_status);
  }
  sheet.getRange(rowIndex, 16).setValue(new Date().toISOString());

  logSync('UPDATE_STATUS', order_id, 'UPDATED', 'New status: ' + status);
  return jsonResponse(true, 'Order status updated in Google Sheets', 200, { order_id: order_id, status: status });
}

/**
 * Internal logger to the Sync_Logs tab
 */
function logSync(event, entityId, status, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAMES.LOGS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAMES.LOGS);
      sheet.appendRow(['Timestamp', 'Event', 'Entity ID', 'Status', 'Details']);
    }
    sheet.appendRow([new Date().toISOString(), event, entityId, status, details]);
  } catch (e) {
    console.error('Failed to write log row: ' + e);
  }
}

/**
 * Helper to build JSON responses
 */
function jsonResponse(success, message, statusCode, extra) {
  const payload = Object.assign({
    success: success,
    message: message,
    timestamp: new Date().toISOString()
  }, extra || {});

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
