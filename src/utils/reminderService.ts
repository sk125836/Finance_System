import { Invoice, ReminderLog, AutomationSettings } from '../types/invoice';

export type ReminderTemplateType =
  | 'approaching'
  | 'due_today'
  | 'overdue_1'
  | 'overdue_2'
  | 'final_notice'
  | 'paid_receipt';

export interface GeneratedReminderEmail {
  templateType: ReminderTemplateType;
  subject: string;
  recipientEmail: string;
  recipientName: string;
  body: string;
  daysDiff: number; // positive = overdue by N days, 0 = due today, negative = due in N days
  urgency: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
}

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  autoCheckEnabled: true,
  alertBeforeDays: 3,
  alertOnDueDate: true,
  alertAfterDays: [3, 7, 14],
  senderName: 'John Dewey | Zoolyum',
  senderEmail: 'billing@zoolyum.com',
  defaultEmailSubject: 'Payment Reminder: Invoice #{invoice_number} from Zoolyum',
  ccEmail: 'finance@zoolyum.com',
  enableWhatsAppQuickLinks: true,
};

/**
 * Calculate difference in days from today (2026-08-20 or current system date)
 */
export function getDaysDifference(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dueDateStr.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - due.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine urgency and recommended template type based on invoice status & due date
 */
export function determineReminderTemplate(invoice: Invoice): {
  templateType: ReminderTemplateType;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  daysDiff: number;
  label: string;
} {
  if (invoice.status === 'paid') {
    return {
      templateType: 'paid_receipt',
      urgency: 'low',
      daysDiff: 0,
      label: 'Payment Confirmed',
    };
  }

  const daysDiff = getDaysDifference(invoice.dueDate);

  if (daysDiff > 14) {
    return {
      templateType: 'final_notice',
      urgency: 'critical',
      daysDiff,
      label: `${daysDiff} Days Overdue (Final Notice)`,
    };
  } else if (daysDiff >= 7) {
    return {
      templateType: 'overdue_2',
      urgency: 'high',
      daysDiff,
      label: `${daysDiff} Days Overdue (2nd Notice)`,
    };
  } else if (daysDiff > 0) {
    return {
      templateType: 'overdue_1',
      urgency: 'high',
      daysDiff,
      label: `${daysDiff} Days Overdue`,
    };
  } else if (daysDiff === 0) {
    return {
      templateType: 'due_today',
      urgency: 'medium',
      daysDiff: 0,
      label: 'Payment Due Today',
    };
  } else if (daysDiff >= -5) {
    return {
      templateType: 'approaching',
      urgency: 'medium',
      daysDiff,
      label: `Due in ${Math.abs(daysDiff)} Days`,
    };
  } else {
    return {
      templateType: 'approaching',
      urgency: 'low',
      daysDiff,
      label: `Upcoming (Due ${invoice.dueDate})`,
    };
  }
}

/**
 * Generate formatted business email text for an invoice
 */
export function generateEmailContent(
  invoice: Invoice,
  templateTypeOverride?: ReminderTemplateType
): GeneratedReminderEmail {
  const { templateType, urgency, daysDiff } = determineReminderTemplate(invoice);
  const activeType = templateTypeOverride || templateType;

  const clientName = invoice.client.name || 'Valued Client';
  const companyName = invoice.client.company ? ` (${invoice.client.company})` : '';
  const invNumber = invoice.invoiceNumber;
  const currencySymbol = invoice.currency?.symbol || '৳';
  const totalAmount = invoice.totalAmount.toLocaleString();
  const balanceDue = (invoice.balanceDue || invoice.totalAmount).toLocaleString();
  const dueDate = invoice.dueDate;
  const paymentDetails = invoice.paymentDetails || invoice.company.defaultPaymentDetails;
  const myCompanyName = invoice.company?.name || 'Zoolyum';
  const myCompanyTagline = invoice.company?.tagline || 'Brand Strategy & Digital Innovation';
  const mySignerName = invoice.company?.authorizedSignerName || 'John Dewey';

  const bankInfo = paymentDetails?.bankName
    ? `Bank: ${paymentDetails.bankName}\nAccount Name: ${paymentDetails.accountName || myCompanyName}\nAccount No: ${paymentDetails.accountNumber || '1102938475001'}\nBranch: ${paymentDetails.branch || 'Mirpur Branch'}\nRouting: ${paymentDetails.routingNumber || '225261738'}`
    : `bKash / Nagad: 01601000950\nBank: City Bank PLC (Acc: 1102938475001)`;

  let subject = '';
  let body = '';
  let recommendedAction = '';

  switch (activeType) {
    case 'approaching':
      subject = `Friendly Reminder: Payment for Invoice #${invNumber} Due on ${dueDate} - ${myCompanyName}`;
      recommendedAction = 'Send Friendly Reminder';
      body = `Dear ${clientName}${companyName},

Hope this email finds you well.

This is a friendly reminder that Invoice #${invNumber} for ${currencySymbol} ${balanceDue} is scheduled for payment on ${dueDate} (in ${Math.abs(daysDiff)} days).

Invoice Summary:
------------------------------------------
• Invoice Number: #${invNumber}
• Issue Date: ${invoice.issueDate}
• Due Date: ${dueDate}
• Balance Due: ${currencySymbol} ${balanceDue}
------------------------------------------

Payment Methods:
${bankInfo}
Mobile Wallet / bKash: ${paymentDetails?.mobileWalletNumber || '01601000950'}
(Please include Invoice #${invNumber} in payment reference)

If payment has already been scheduled or dispatched, kindly ignore this message. Should you require any assistance or an updated document copy, please don't hesitate to reach out.

Thank you for your valued partnership!

Warm regards,

Finance & Accounts Team
${myCompanyName} | ${myCompanyTagline}
Phone: ${invoice.company.phone || '01601000950'}
Email: ${invoice.company.email || 'billing@zoolyum.com'}
Website: https://${invoice.company.website || 'zoolyum.com'}`;
      break;

    case 'due_today':
      subject = `Payment Due Today: Invoice #${invNumber} [${currencySymbol} ${balanceDue}] - ${myCompanyName}`;
      recommendedAction = 'Send Due Today Reminder';
      body = `Dear ${clientName}${companyName},

We hope you are having a productive day.

Please be advised that Invoice #${invNumber} for the amount of ${currencySymbol} ${balanceDue} is due for payment today (${dueDate}).

Summary of Due Payment:
------------------------------------------
• Invoice: #${invNumber}
• Total Amount: ${currencySymbol} ${totalAmount}
• Amount Due Today: ${currencySymbol} ${balanceDue}
------------------------------------------

Payment Instructions:
${bankInfo}
bKash / Nagad Merchant: ${paymentDetails?.mobileWalletNumber || '01601000950'}
Reference: #${invNumber}

Please confirm once the transaction has been initiated so our accounts department can issue the payment receipt promptly.

Thank you for your prompt attention.

Best regards,

${mySignerName}
Finance Lead | ${myCompanyName}
Email: ${invoice.company.email || 'billing@zoolyum.com'} | Contact: ${invoice.company.phone || '01601000950'}`;
      break;

    case 'overdue_1':
      subject = `OVERDUE NOTICE: Invoice #${invNumber} is past due by ${daysDiff} days - ${myCompanyName}`;
      recommendedAction = 'Send 1st Overdue Notice';
      body = `Dear ${clientName}${companyName},

According to our accounts records, we have not yet received payment for Invoice #${invNumber}, which was due on ${dueDate} (now ${daysDiff} days past due).

Outstanding Invoice Details:
------------------------------------------
• Invoice Number: #${invNumber}
• Original Due Date: ${dueDate}
• Days Overdue: ${daysDiff} days
• Outstanding Balance: ${currencySymbol} ${balanceDue}
------------------------------------------

To ensure uninterrupted service and maintain good standing, we kindly request that you settle this invoice at your earliest convenience.

Payment Transfer Options:
${bankInfo}
Mobile Wallet / bKash: ${paymentDetails?.mobileWalletNumber || '01601000950'}

If you have already processed this payment, please reply with the transaction slip / reference so we can update your account immediately.

Sincerely,

Accounts & Billing Department
${myCompanyName} | ${myCompanyTagline}
Email: ${invoice.company.email || 'billing@zoolyum.com'} | Phone: ${invoice.company.phone || '01601000950'}`;
      break;

    case 'overdue_2':
      subject = `URGENT: 2nd Overdue Notice - Invoice #${invNumber} (${daysDiff} Days Past Due) - ${myCompanyName}`;
      recommendedAction = 'Send Urgent 2nd Notice';
      body = `Dear ${clientName}${companyName},

We are following up on our previous notice regarding outstanding Invoice #${invNumber}, which is now ${daysDiff} days past due.

Invoice Summary:
------------------------------------------
• Invoice ID: #${invNumber}
• Due Date: ${dueDate}
• Overdue Duration: ${daysDiff} Days
• Balance Payable: ${currencySymbol} ${balanceDue}
------------------------------------------

We value our professional relationship and want to help resolve this promptly. Please make the payment today or contact us immediately if there are any questions regarding this invoice.

Settlement Channels:
${bankInfo}
Mobile Banking: ${paymentDetails?.mobileWalletNumber || '01601000950'}
Reference Note: #${invNumber}

We appreciate your immediate response and cooperation.

Regards,

Management & Accounts
${myCompanyName}
Direct line: ${invoice.company.phone || '01601000950'}`;
      break;

    case 'final_notice':
      subject = `FINAL NOTICE: Immediate Settlement Required for Invoice #${invNumber} - ${myCompanyName}`;
      recommendedAction = 'Send Final Notice';
      body = `Dear ${clientName}${companyName},

This is a FINAL NOTICE regarding overdue Invoice #${invNumber} in the amount of ${currencySymbol} ${balanceDue}, originally due on ${dueDate} (${daysDiff} days overdue).

Despite prior notifications, this balance remains unsettled. We urge you to clear this outstanding amount within the next 48 hours to avoid service suspension or escalation.

Immediate Settlement Information:
------------------------------------------
• Invoice: #${invNumber}
• Total Overdue: ${currencySymbol} ${balanceDue}
• Due Date was: ${dueDate}
------------------------------------------

Bank Account Transfer:
${bankInfo}
bKash/Nagad: ${paymentDetails?.mobileWalletNumber || '01601000950'}

Please send proof of payment to ${invoice.company.email || 'billing@zoolyum.com'} immediately upon transfer.

Respectfully,

Executive Accounts Officer
${myCompanyName}`;
      break;

    case 'paid_receipt':
      subject = `Payment Received - Thank You for Invoice #${invNumber} - ${myCompanyName}`;
      recommendedAction = 'Send Payment Receipt';
      body = `Dear ${clientName}${companyName},

Thank you for your payment! We have received full payment for Invoice #${invNumber} (${currencySymbol} ${totalAmount}).

Your account is fully settled and in good standing. We look forward to our continued collaboration and creating outstanding results together.

Best regards,

${myCompanyName} Team`;
      break;
  }

  return {
    templateType: activeType,
    subject,
    recipientEmail: invoice.client.email || 'client@example.com',
    recipientName: invoice.client.name,
    body,
    daysDiff,
    urgency,
    recommendedAction,
  };
}

/**
 * Generate standard mailto link
 */
export function buildMailtoUrl(
  recipient: string,
  subject: string,
  body: string,
  cc?: string
): string {
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body);
  if (cc) params.set('cc', cc);
  return `mailto:${recipient}?${params.toString()}`;
}

/**
 * Generate WhatsApp Web share link
 */
export function buildWhatsAppReminderUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Filter invoices that require automated reminders
 */
export function getInvoicesRequiringReminders(
  invoices: Invoice[],
  settings: AutomationSettings = DEFAULT_AUTOMATION_SETTINGS
): {
  overdueInvoices: Invoice[];
  dueTodayInvoices: Invoice[];
  approachingInvoices: Invoice[];
  allAttentionInvoices: Invoice[];
  totalOverdueAmount: number;
  totalAttentionAmount: number;
} {
  const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');

  const overdueInvoices: Invoice[] = [];
  const dueTodayInvoices: Invoice[] = [];
  const approachingInvoices: Invoice[] = [];

  let totalOverdueAmount = 0;
  let totalAttentionAmount = 0;

  pendingInvoices.forEach((inv) => {
    const diff = getDaysDifference(inv.dueDate);
    const amount = inv.balanceDue || inv.totalAmount;

    if (diff > 0) {
      overdueInvoices.push(inv);
      totalOverdueAmount += amount;
      totalAttentionAmount += amount;
    } else if (diff === 0) {
      dueTodayInvoices.push(inv);
      totalAttentionAmount += amount;
    } else if (Math.abs(diff) <= settings.alertBeforeDays) {
      approachingInvoices.push(inv);
      totalAttentionAmount += amount;
    }
  });

  // Sort by urgency (most overdue first, then due today, then approaching)
  overdueInvoices.sort((a, b) => getDaysDifference(b.dueDate) - getDaysDifference(a.dueDate));
  approachingInvoices.sort((a, b) => getDaysDifference(b.dueDate) - getDaysDifference(a.dueDate));

  const allAttentionInvoices = [
    ...overdueInvoices,
    ...dueTodayInvoices,
    ...approachingInvoices,
  ];

  return {
    overdueInvoices,
    dueTodayInvoices,
    approachingInvoices,
    allAttentionInvoices,
    totalOverdueAmount,
    totalAttentionAmount,
  };
}
