import React, { useEffect, useMemo, useState } from 'react'

const backend = import.meta.env.VITE_BACKEND_URL || ''

function Section({ title, children }) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-xl shadow p-5 border border-gray-100">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">{title}</h2>
      <div>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  )
}

export default function App() {
  // Basic state for quick demo flows
  const [role, setRole] = useState('employee') // employee | manager | purchasing
  const [users, setUsers] = useState({ employees: [], managers: [], purchasing: [] })
  const [employeeId, setEmployeeId] = useState('')
  const [managerId, setManagerId] = useState('')

  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const [prLines, setPrLines] = useState([])
  const [employeePRs, setEmployeePRs] = useState([])
  const [managerPRs, setManagerPRs] = useState([])
  const [approvedPRs, setApprovedPRs] = useState([])
  const [pos, setPOs] = useState([])
  const [grs, setGRs] = useState([])
  const [inventory, setInventory] = useState([])
  const [notifications, setNotifications] = useState([])

  const currentUserId = useMemo(() => {
    if (role === 'employee') return employeeId
    if (role === 'manager') return managerId
    return ''
  }, [role, employeeId, managerId])

  async function api(path, options) {
    const res = await fetch(`${backend}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async function bootstrap() {
    // Create sample users if none exist
    const emps = await api('/users?role=employee')
    const mgrs = await api('/users?role=manager')
    const purch = await api('/users?role=purchasing')
    let e = emps, m = mgrs, p = purch
    if (emps.length === 0 || mgrs.length === 0 || purch.length === 0) {
      // create demo data
      const mId = (await api('/users', { method: 'POST', body: JSON.stringify({ name: 'Mila Manager', email: 'mila@corp.com', role: 'manager' }) })).id
      const eId = (await api('/users', { method: 'POST', body: JSON.stringify({ name: 'Evan Employee', email: 'evan@corp.com', role: 'employee', manager_id: mId }) })).id
      const pId = (await api('/users', { method: 'POST', body: JSON.stringify({ name: 'Paula Purchasing', email: 'paula@corp.com', role: 'purchasing' }) })).id
      e = await api('/users?role=employee')
      m = await api('/users?role=manager')
      p = await api('/users?role=purchasing')
      setEmployeeId(eId)
      setManagerId(mId)
    }
    setUsers({ employees: e, managers: m, purchasing: p })

    // Items & suppliers sample
    const its = await api('/items')
    if (its.length === 0) {
      await api('/items', { method: 'POST', body: JSON.stringify({ sku: 'PAPER-A4', name: 'Printer Paper A4', uom: 'pack' }) })
      await api('/items', { method: 'POST', body: JSON.stringify({ sku: 'PEN-BLUE', name: 'Blue Pen', uom: 'pcs' }) })
    }
    setItems(await api('/items'))

    const sups = await api('/suppliers')
    if (sups.length === 0) {
      await api('/suppliers', { method: 'POST', body: JSON.stringify({ name: 'OfficeMax', code: 'OMX' }) })
    }
    setSuppliers(await api('/suppliers'))

    refreshAll()
  }

  async function refreshAll() {
    const eprs = await api(`/prs?employee_id=${employeeId || ''}`)
    setEmployeePRs(eprs)
    const mprs = await api(`/prs?status=submitted&manager_id=${managerId || ''}`)
    setManagerPRs(mprs)
    setApprovedPRs(await api('/prs?status=approved'))
    setPOs(await api('/pos'))
    setGRs(await api('/grs'))
    setInventory(await api('/inventory'))

    const notifs = await api(`/notifications?user_id=${currentUserId || ''}&role=${role === 'purchasing' ? 'purchasing' : ''}`)
    setNotifications(notifs)
  }

  useEffect(() => {
    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, employeeId, managerId])

  function addLine(item) {
    setPrLines([...prLines, { sku: item.sku, name: item.name, qty: 1, uom: item.uom }])
  }

  function updateLine(i, field, value) {
    const copy = [...prLines]
    copy[i] = { ...copy[i], [field]: value }
    setPrLines(copy)
  }

  async function submitPR() {
    if (!employeeId || !managerId || prLines.length === 0) return
    await api('/prs', { method: 'POST', body: JSON.stringify({ employee_id: employeeId, manager_id: managerId, lines: prLines }) })
    setPrLines([])
    refreshAll()
  }

  async function approvePR(prId, approve) {
    await api(`/prs/${prId}/decision`, { method: 'POST', body: JSON.stringify({ manager_id: managerId, approve }) })
    refreshAll()
  }

  async function createPO(prId) {
    const supplierId = suppliers[0]?.id
    if (!supplierId) return
    await api('/pos', { method: 'POST', body: JSON.stringify({ pr_id: prId, supplier_id: supplierId }) })
    refreshAll()
  }

  async function receiveGoods(po) {
    const lines = po.lines.map(l => ({ sku: l.sku, name: l.name, qty_received: l.qty, uom: l.uom }))
    await api('/grs', { method: 'POST', body: JSON.stringify({ po_id: po.id, lines }) })
    refreshAll()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50">
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-800">E-Procurement Demo</h1>
          <div className="flex items-center gap-3">
            <select className="px-3 py-2 rounded border bg-white" value={role} onChange={e => setRole(e.target.value)}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="purchasing">Purchasing Staff</option>
            </select>
            {role === 'employee' && (
              <select className="px-3 py-2 rounded border bg-white" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                <option value="">Select Employee</option>
                {users.employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            {role === 'manager' && (
              <select className="px-3 py-2 rounded border bg-white" value={managerId} onChange={e => setManagerId(e.target.value)}>
                <option value="">Select Manager</option>
                {users.managers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
          </div>
        </header>

        {role === 'employee' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Create Purchase Request">
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {items.map(it => (
                    <button key={it.id} onClick={() => addLine(it)} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">
                      + {it.name}
                    </button>
                  ))}
                </div>
              </div>
              {prLines.length > 0 && (
                <div className="space-y-2">
                  {prLines.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5 text-sm">{l.name}</div>
                      <div className="col-span-3">
                        <input type="number" className="w-full px-2 py-1 rounded border" value={l.qty} onChange={e => updateLine(i, 'qty', parseFloat(e.target.value))} />
                      </div>
                      <div className="col-span-2 text-sm text-gray-600">{l.uom}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Field label="Approver">
                  <select className="px-3 py-2 rounded border bg-white" value={managerId} onChange={e => setManagerId(e.target.value)}>
                    <option value="">Select Manager</option>
                    {users.managers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </Field>
                <button onClick={submitPR} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Submit PR</button>
              </div>
            </Section>

            <Section title="My Purchase Requests">
              <ul className="divide-y">
                {employeePRs.map(pr => (
                  <li key={pr.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">PR {pr.id.slice(-6)} — <span className="capitalize">{pr.status}</span></div>
                      <div className="text-sm text-gray-600">{pr.lines.map(l => `${l.name} x ${l.qty}`).join(', ')}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}

        {role === 'manager' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Pending Approvals">
              <ul className="divide-y">
                {managerPRs.map(pr => (
                  <li key={pr.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">PR {pr.id.slice(-6)}</div>
                      <div className="text-sm text-gray-600">{pr.lines.map(l => `${l.name} x ${l.qty}`).join(', ')}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approvePR(pr.id, true)} className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700">Approve</button>
                      <button onClick={() => approvePR(pr.id, false)} className="px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700">Reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Notifications">
              {notifications.length === 0 && <div className="text-sm text-gray-600">No new notifications</div>}
              <ul className="divide-y">
                {notifications.map(n => (
                  <li key={n.id} className="py-2 text-sm"><span className="font-medium">{n.title}:</span> {n.message}</li>
                ))}
              </ul>
            </Section>
          </div>
        )}

        {role === 'purchasing' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Approved PRs">
              <ul className="divide-y">
                {approvedPRs.map(pr => (
                  <li key={pr.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">PR {pr.id.slice(-6)}</div>
                      <div className="text-sm text-gray-600">{pr.lines.map(l => `${l.name} x ${l.qty}`).join(', ')}</div>
                    </div>
                    <button onClick={() => createPO(pr.id)} className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">Create PO</button>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Purchase Orders">
              <ul className="divide-y">
                {pos.map(po => (
                  <li key={po.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">PO {po.id.slice(-6)} — <span className="capitalize">{po.status.replace('_', ' ')}</span></div>
                      {po.status !== 'received' && (
                        <button onClick={() => receiveGoods(po)} className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700">Record GR</button>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{po.lines.map(l => `${l.name} x ${l.qty}`).join(', ')}</div>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Inventory Levels">
              <ul className="divide-y">
                {inventory.map(it => (
                  <li key={it.id} className="py-2 flex items-center justify-between">
                    <div>{it.sku}</div>
                    <div className="text-sm">{it.on_hand} {it.uom}</div>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Notifications">
              {notifications.length === 0 && <div className="text-sm text-gray-600">No new notifications</div>}
              <ul className="divide-y">
                {notifications.map(n => (
                  <li key={n.id} className="py-2 text-sm"><span className="font-medium">{n.title}:</span> {n.message}</li>
                ))}
              </ul>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}
