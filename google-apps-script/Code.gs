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
 * Formats a phone number safely for Google Sheets to prevent formula interpretation
 * and preserve '+', leading zeros, spaces, and hyphens.
 */
function formatPhoneForSheets(phone) {
  if (phone === null || phone === undefined) return '';
  const phoneStr = String(phone).trim();
  if (!phoneStr) return '';
  // If it already starts with an apostrophe, return as-is
  if (phoneStr.startsWith("'")) return phoneStr;
  // Prefix with single quote so Google Sheets treats it strictly as plain text
  return "'" + phoneStr;
}

/**
 * Initializes all required sheets and header rows if they do not exist
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Customers Tab
  const custSheet = getOrCreateSheet(ss, SHEET_NAMES.CUSTOMERS, [
    'User ID',
    'Email',
    'Full Name',
    'Phone',
    'Role',
    'Delivery Address',
    'Registered At',
    'Last Synced At'
  ]);
  try {
    custSheet.getRange('D:D').setNumberFormat('@');
  } catch (e) {}

  // 2. Orders Tab
  const ordSheet = getOrCreateSheet(ss, SHEET_NAMES.ORDERS, [
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
  try {
    ordSheet.getRange('E:E').setNumberFormat('@');
  } catch (e) {}

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

    // Fail-closed secret verification: reject if expected secret is not configured or provided secret does not match
    const providedSecret = payload ? payload.secret : null;
    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      logSync('AUTH_FAILURE', 'N/A', 'REJECTED', !expectedSecret ? 'Server webhook secret unconfigured' : 'Invalid or missing secret key');
      return jsonResponse(false, 'Unauthorized: Invalid or unconfigured secret key', 401);
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

      case 'REPAIR_PHONE_CELLS':
        return repairPhoneCells(ss);

      case 'GET_ORDERS_AUDIT':
        return getOrdersAudit(ss);

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
  const safePhone = formatPhoneForSheets(customer.phone);
  const rowData = [
    customer.id,
    customer.email || '',
    customer.full_name || '',
    safePhone,
    customer.role || 'customer',
    customer.address || '',
    customer.created_at || nowStr,
    nowStr
  ];

  if (rowIndex > 0) {
    try {
      sheet.getRange(rowIndex, 4).setNumberFormat('@');
    } catch (e) {}
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    logSync('SYNC_CUSTOMER', customer.id, 'UPDATED', 'Updated customer ' + customer.email);
  } else {
    sheet.appendRow(rowData);
    try {
      sheet.getRange(sheet.getLastRow(), 4).setNumberFormat('@');
    } catch (e) {}
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

  const safePhone = formatPhoneForSheets(order.customer_phone);
  const rowData = [
    order.id,
    order.order_number || '',
    order.customer_email || '',
    order.customer_name || '',
    safePhone,
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
    try {
      orderSheet.getRange(rowIndex, 5).setNumberFormat('@');
    } catch (e) {}
    orderSheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    orderSheet.appendRow(rowData);
    try {
      orderSheet.getRange(orderSheet.getLastRow(), 5).setNumberFormat('@');
    } catch (e) {}
  }

  // Sync order items idempotently (prevent duplicate rows on repeated syncs)
  if (Array.isArray(order.items) && order.items.length > 0) {
    const itemsSheet = ss.getSheetByName(SHEET_NAMES.ORDER_ITEMS);
    const itemsData = itemsSheet.getDataRange().getValues();

    // Map existing item IDs to row indices (1-indexed for SpreadsheetApp)
    const existingItemRows = {};
    for (let i = 1; i < itemsData.length; i++) {
      const itemId = itemsData[i][0];
      if (itemId) {
        existingItemRows[itemId] = i + 1;
      }
    }

    order.items.forEach(function(item) {
      const itemId = item.id || (order.id + '_' + (item.food_name || 'item'));
      const itemRowData = [
        itemId,
        order.id,
        order.order_number || '',
        item.food_name || '',
        Number(item.unit_price || 0).toFixed(2),
        item.quantity || 1,
        Number(item.subtotal || 0).toFixed(2),
        order.created_at || nowStr
      ];

      const existingRow = existingItemRows[itemId];
      if (existingRow) {
        itemsSheet.getRange(existingRow, 1, 1, itemRowData.length).setValues([itemRowData]);
      } else {
        itemsSheet.appendRow(itemRowData);
      }
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

/**
 * Repairs only the two specific phone cells for known orders affected by formula interpretation.
 * Preserves all other columns and values exactly.
 */
function repairPhoneCells(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
  if (!sheet) {
    return jsonResponse(false, 'Orders sheet not found', 404);
  }

  const data = sheet.getDataRange().getValues();
  // Map of verified target orders to authoritative phone numbers from Supabase records
  const targets = {
    'ORD-20261023-2667': '+1 555-0199',
    '6f1035a9-a84a-434d-aa3e-f178cb4c5770': '+1 555-0199',
    'ORD-20261023-1133': '+1 555-0199',
    'd2caec13-5e0f-48ba-8bad-baa52edb1ec6': '+1 555-0199'
  };

  const repaired = [];

  for (let i = 1; i < data.length; i++) {
    const orderId = String(data[i][0] || '').trim();
    const orderNumber = String(data[i][1] || '').trim();

    const expectedPhone = targets[orderNumber] || targets[orderId];
    if (expectedPhone) {
      const rowIndex = i + 1; // 1-indexed row in sheet
      const phoneCell = sheet.getRange(rowIndex, 5); // Column E: Customer Phone
      phoneCell.setNumberFormat('@');
      phoneCell.setValue("'" + expectedPhone);
      repaired.push({ row: rowIndex, orderNumber: orderNumber, phone: expectedPhone });
      logSync('REPAIR_PHONE', orderNumber || orderId, 'SUCCESS', 'Repaired phone cell to ' + expectedPhone);
    }
  }

  return jsonResponse(true, 'Phone cells repair complete', 200, { repaired: repaired });
}

/**
 * Manual execution trigger for the Apps Script editor toolbar
 */
function repairPhoneCellsManual() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return repairPhoneCells(ss);
}

/**
 * Read-only inspection of orders in Google Sheets for verification
 */
function getOrdersAudit(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
  if (!sheet) {
    return jsonResponse(false, 'Orders sheet not found', 404);
  }

  const data = sheet.getDataRange().getValues();
  const orders = [];

  for (let i = 1; i < data.length; i++) {
    orders.push({
      order_id: data[i][0],
      order_number: data[i][1],
      customer_email: data[i][2],
      customer_name: data[i][3],
      customer_phone: data[i][4],
      status: data[i][5],
      payment_status: data[i][6],
      payment_method: data[i][7],
      total_amount: data[i][11]
    });
  }

  return jsonResponse(true, 'Orders retrieved successfully', 200, { orders: orders });
}

