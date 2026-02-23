const getBaseTemplate = (content) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kushagro Email</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-top: 20px;
      margin-bottom: 20px;
    }
    .header {
      background-color: #2C6B00;
      color: #ffffff;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
      color: #333333;
      line-height: 1.6;
    }
    .otp-code {
      font-size: 32px;
      font-weight: bold;
      color: #2C6B00;
      text-align: center;
      margin: 20px 0;
      letter-spacing: 5px;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2C6B00;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: #888888;
      border-top: 1px solid #eeeeee;
    }
    .divider {
      height: 1px;
      background-color: #eeeeee;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Kushagro</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Kushagro. All rights reserved.</p>
      <p>This is an automated email, please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = getBaseTemplate;
