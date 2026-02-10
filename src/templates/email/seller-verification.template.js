const getBaseTemplate = require('./base.template');

const getSellerVerificationEmailTemplate = (sellerName, status, reason = '') => {
  const isApproved = status === 'approved';
  const statusColor = isApproved ? '#4CAF50' : '#F44336';
  const statusText = isApproved ? 'APPROVED' : 'REJECTED';

  let bodyContent = '';
  if (isApproved) {
    bodyContent = `
      <p>Congratulations! Your seller account document verification has been <strong>approved</strong>.</p>
      <p>You can now log in to your seller dashboard and start listing your products.</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/seller/login" class="btn" style="background-color: #4CAF50; color: #ffffff;">Go to Seller Dashboard</a>
      </div>
    `;
  } else {
    bodyContent = `
      <p>We regret to inform you that your seller account verification has been <strong>rejected</strong>.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please review your documents and try submitting again.</p>
    `;
  }

  const content = `
    <h2>Seller Verification Update</h2>
    <p>Dear ${sellerName},</p>
    <p>Your verification status has been updated to: <span style="font-weight: bold; color: ${statusColor};">${statusText}</span></p>
    
    ${bodyContent}
    
    <div class="divider"></div>
    <p>Best regards,<br>Team Kushagro</p>
  `;
  return getBaseTemplate(content);
};

module.exports = getSellerVerificationEmailTemplate;
