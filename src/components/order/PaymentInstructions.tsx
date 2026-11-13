import type { SiteSettings } from '../../lib/api';
import { formatKES } from '../../lib/format';

interface PaymentInstructionsProps {
  payment: SiteSettings['payment'];
  orderNumber: string;
  amountDue: number;
  isDeposit: boolean;
}

/** Manual payment details from Settings. No online payment is taken. */
export function PaymentInstructions({ payment, orderNumber, amountDue, isDeposit }: PaymentInstructionsProps) {
  const { paybill, till, bank } = payment;
  const hasPaybill = Boolean(paybill.businessNumber);
  const hasBank = Boolean(bank.accountNumber);
  const hasAny = hasPaybill || Boolean(till) || hasBank;
  return (
    <section aria-labelledby="pay-heading" className="card p-5 sm:p-6">
      <h2 id="pay-heading" className="text-2xl">How to pay</h2>
      <p className="mt-2 text-sm text-muted">
        Please wait for our WhatsApp confirmation, then pay {isDeposit ? 'the deposit of ' : ''}
        <strong className="text-navy-800">{formatKES(amountDue)}</strong> using <strong className="text-navy-800">{orderNumber}</strong> as the reference.
      </p>
      {hasAny ? (
        <dl className="mt-4 space-y-3 text-sm">
          {hasPaybill && (
            <div className="bg-paper-100 p-3">
              <dt className="font-semibold text-navy-800">M-Pesa Paybill</dt>
              <dd className="mt-1 text-muted">
                Business number <strong className="text-navy-800">{paybill.businessNumber}</strong>, account{' '}
                <strong className="text-navy-800">{orderNumber}</strong>
              </dd>
            </div>
          )}
          {till && (
            <div className="bg-paper-100 p-3">
              <dt className="font-semibold text-navy-800">M-Pesa Buy Goods (Till)</dt>
              <dd className="mt-1 text-muted">
                Till number <strong className="text-navy-800">{till}</strong>
              </dd>
            </div>
          )}
          {hasBank && (
            <div className="bg-paper-100 p-3">
              <dt className="font-semibold text-navy-800">Bank transfer</dt>
              <dd className="mt-1 space-y-0.5 text-muted">
                {bank.bankName && <p>{bank.bankName}{bank.branch && `, ${bank.branch}`}</p>}
                {bank.accountName && <p>Account name: {bank.accountName}</p>}
                <p>Account number: <strong className="text-navy-800">{bank.accountNumber}</strong></p>
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-4 bg-paper-100 p-3 text-sm text-navy-800">
          We will send payment details with your WhatsApp confirmation.
        </p>
      )}
      {payment.notes && <p className="mt-4 text-sm text-muted">{payment.notes}</p>}
    </section>
  );
}
