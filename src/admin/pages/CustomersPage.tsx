import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import { ApiError, getCustomer, listCustomers, updateCustomer } from '../../lib/api/admin';
import { dateStamp, downloadCsv } from '../../lib/admin/csv';
import { formatKES, formatLongDate } from '../../lib/format';
import { formatKePhone } from '../../lib/phone';
import { whatsappLink } from '../../lib/whatsapp';
import { Btn, Card, Empty, inputCls, LabeledField, Loading, Notice, PageHeader, StatusBadge } from '../components/ui';

export function CustomersPage() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const { data, loading, error } = useAsync(() => listCustomers(search), [search]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(input), 300);
    return () => window.clearTimeout(t);
  }, [input]);

  const exportCsv = () =>
    downloadCsv(
      `customers-${dateStamp()}.csv`,
      ['Name', 'Phone', 'Email', 'City', 'Address', 'Orders', 'Total spent', 'Last order', 'Customer since', 'Notes'],
      (data ?? []).map((c) => [c.full_name, c.phone, c.email, c.city, c.address, c.order_count, c.total_spent, c.last_order_at, c.created_at, c.notes]),
    );

  return (
    <>
      <PageHeader title="Customers" description="Created automatically from orders (matched by phone number)." actions={<Btn variant="secondary" onClick={exportCsv} disabled={!data?.length}>Export CSV</Btn>} />
      {error && <Notice kind="error">{error.message}</Notice>}
      <input type="search" aria-label="Search customers" placeholder="Search name, phone, email or town" className={`${inputCls} mb-4 max-w-sm`} value={input} onChange={(e) => setInput(e.target.value)} />
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>No customers {search ? 'match' : 'yet'}.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-paper-50 text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Town</th>
                <th className="px-3 py-2 text-right">Orders</th>
                <th className="px-3 py-2 text-right">Total spent</th>
                <th className="px-3 py-2">Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-paper-50">
                  <td className="px-3 py-2"><Link to={`/admin/customers/${c.id}`} className="font-medium text-navy-800 hover:underline">{c.full_name}</Link></td>
                  <td className="px-3 py-2">{formatKePhone(c.phone)}</td>
                  <td className="px-3 py-2">{c.city}</td>
                  <td className="px-3 py-2 text-right">{c.order_count}</td>
                  <td className="px-3 py-2 text-right">{formatKES(c.total_spent ?? 0)}</td>
                  <td className="px-3 py-2">{c.last_order_at ? formatLongDate(c.last_order_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useAsync(() => getCustomer(id), [id]);
  const [form, setForm] = useState({ full_name: '', email: '', address: '', city: '', notes: '' });
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (data) {
      const c = data.customer;
      setForm({ full_name: c.full_name, email: c.email ?? '', address: c.address ?? '', city: c.city ?? '', notes: c.notes ?? '' });
    }
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <Notice kind="error">{error?.message ?? 'Customer not found.'}</Notice>;
  const { customer, orders } = data;

  const save = async () => {
    try {
      await updateCustomer(customer.id, {
        full_name: form.full_name.trim() || customer.full_name,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        notes: form.notes.trim() || null,
      });
      setMsg({ kind: 'success', text: 'Saved.' });
      reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not save.' });
    }
  };

  return (
    <>
      <PageHeader
        title={customer.full_name}
        description={`Customer since ${formatLongDate(customer.created_at)}`}
        actions={
          <>
            <Link to="/admin/customers" className="rounded-lg border border-paper-300 bg-white px-3.5 py-2 text-sm text-navy-800">Back</Link>
            <a href={whatsappLink(customer.phone, `Hello ${customer.full_name.split(' ')[0]}, this is Mandela Heritage Furniture.`)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#1f7a4d] px-3.5 py-2 text-sm text-white">
              WhatsApp
            </a>
          </>
        }
      />
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <Card title={`Orders (${customer.order_count ?? 0}) · ${formatKES(customer.total_spent ?? 0)} spent`}>
          {orders.length === 0 ? (
            <Empty>No orders.</Empty>
          ) : (
            <ul className="divide-y divide-paper-200 text-sm">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-3 py-2 hover:bg-paper-50">
                    <span className="font-medium text-navy-800">{o.order_number}</span>
                    <span className="text-muted">{formatLongDate(o.created_at)}</span>
                    <StatusBadge value={o.status} />
                    <StatusBadge value={o.payment_status} />
                    <span className="ml-auto font-medium">{formatKES(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Details">
          <p className="mb-3 text-sm">{formatKePhone(customer.phone)} <span className="text-xs text-muted">(phone identifies the customer and cannot be changed here)</span></p>
          <div className="space-y-3">
            {(['full_name', 'email', 'address', 'city'] as const).map((k) => (
              <LabeledField key={k} label={{ full_name: 'Name', email: 'Email', address: 'Address', city: 'Town' }[k]}>
                {(fid) => <input id={fid} className={inputCls} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />}
              </LabeledField>
            ))}
            <LabeledField label="Notes" hint="Only visible to staff.">
              {(fid) => <textarea id={fid} rows={4} className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />}
            </LabeledField>
            <Btn onClick={() => void save()}>Save</Btn>
          </div>
        </Card>
      </div>
    </>
  );
}
