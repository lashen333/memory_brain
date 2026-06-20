// src\lib\email\reminder-template.ts
//this is the email template for the reminder email
export function reminderEmailHtml(params: {
  userName: string
  intentText: string
  memoryContent: string
  appUrl: string
}): string {
  const { userName, intentText, memoryContent, appUrl } = params

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
      <div style="width:28px;height:28px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-size:14px;font-weight:600">M</span>
      </div>
      <span style="color:white;font-size:15px;font-weight:600">Memory Vault</span>
    </div>

    <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:24px">
      <p style="color:#71717a;font-size:13px;margin:0 0 8px">Reminder</p>
      <h2 style="color:white;font-size:18px;font-weight:600;margin:0 0 16px">
        ${intentText}
      </h2>
      <div style="background:#0f0f10;border-radius:10px;padding:14px;margin-bottom:20px">
        <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0">
          ${memoryContent.slice(0, 200)}
        </p>
      </div>
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;font-size:13px;font-weight:500;padding:10px 20px;border-radius:8px">
        Open Memory Vault
      </a>
    </div>

    <p style="color:#52525b;font-size:12px;text-align:center;margin-top:24px">
      Hi ${userName} — this is an automated reminder from your vault
    </p>
  </div>
</body>
</html>
  `.trim()
}