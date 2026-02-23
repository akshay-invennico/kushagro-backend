const getBaseTemplate = require('./base.template');

const getOrderDeliveredEmailTemplate = (orderId, customerName, items, totalAmount) => {
  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">x${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price}</td>
    </tr>
  `
    )
    .join('');

  const content = `
    <h2>Order Delivered</h2>
    <p>Dear ${customerName},</p>
    <p>We are pleased to inform you that your order has been successfully delivered to your doorstep.</p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold;">Order ID: #${orderId}</p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #eeeeee;">
          <th style="padding: 10px; text-align: left;">Item</th>
          <th style="padding: 10px; text-align: left;">Qty</th>
          <th style="padding: 10px; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: #4CAF50;">${totalAmount}</td>
        </tr>
      </tfoot>
    </table>
    
    <p>Thank you for shopping with us!</p>
    
    <div class="divider"></div>
    <p>Best regards,<br>Team Kushagro</p>
  `;
  return getBaseTemplate(content);
};

module.exports = getOrderDeliveredEmailTemplate;
