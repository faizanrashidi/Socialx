import React, { useState } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  change: string;
}

function MetricCard({ label, value, change }: MetricCardProps) {
  return (
    <div style={{ background: '#1c1738', padding: '20px', borderRadius: '12px', border: '1px solid #2e2652' }}>
      <div style={{ color: '#9d9ab4', fontSize: '13px', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#ffffff' }}>{value}</div>
      <div style={{ color: '#00dfd8', fontSize: '12px' }}>{change}</div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'moderation' | 'users' | 'health'>('analytics');

  const users = [
    { id: '1', username: 'maya_lens', role: 'USER', reports: 0, status: 'ACTIVE' },
    { id: '2', username: 'alex_dev', role: 'USER', reports: 1, status: 'ACTIVE' },
    { id: '3', username: 'spam_bot99', role: 'USER', reports: 14, status: 'SUSPENDED' },
  ];

  const reports = [
    { id: 'rep-1', target: 'Post #9012', reason: 'Spam / Advertising', reporter: 'alex_dev', status: 'PENDING' },
    { id: 'rep-2', target: 'Comment #443', reason: 'Harassment / Abuse', reporter: 'serena_vibes', status: 'REVIEWED' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', background: '#15102e', borderRight: '1px solid #231b47', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #FF007A, #00DFD8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>X</div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>SocialX</h2>
            <span style={{ fontSize: '11px', color: '#ff007a', letterSpacing: '1px' }}>ADMIN CONSOLE</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(['analytics', 'moderation', 'users', 'health'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? '#281c54' : 'transparent',
                color: activeTab === tab ? '#00dfd8' : '#aaa',
                border: 'none',
                padding: '12px 16px',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '32px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, textTransform: 'capitalize' }}>{activeTab} Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#888' }}>Superadmin: faizan@socialx.io</span>
            <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#00dfd822', color: '#00dfd8', fontSize: '11px', fontWeight: 600 }}>LIVE CLUSTER</span>
          </div>
        </header>

        {activeTab === 'analytics' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <MetricCard label="Active Users" value="14,820" change="+12.4% this week" />
              <MetricCard label="Daily Posts & Reels" value="3,410" change="+8.1% today" />
              <MetricCard label="Stories Created" value="8,920" change="+24.6% active 24h" />
              <MetricCard label="Pending Reports" value="2" change="Requires review" />
            </div>

            <div style={{ background: '#1c1738', padding: '24px', borderRadius: '12px', border: '1px solid #2e2652' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Network & Media Bandwidth</h3>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: 1.6 }}>
                S3 Storage utilization: 42.6 GB. Real-time WebSocket connection pool: 890 concurrent clients. Redis cache hit ratio: 94.2%.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'moderation' && (
          <div style={{ background: '#1c1738', borderRadius: '12px', border: '1px solid #2e2652', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead style={{ background: '#15102e', borderBottom: '1px solid #2e2652', color: '#888' }}>
                <tr>
                  <th style={{ padding: '14px' }}>Report ID</th>
                  <th style={{ padding: '14px' }}>Target</th>
                  <th style={{ padding: '14px' }}>Reason</th>
                  <th style={{ padding: '14px' }}>Reporter</th>
                  <th style={{ padding: '14px' }}>Status</th>
                  <th style={{ padding: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #231b47' }}>
                    <td style={{ padding: '14px', fontWeight: 600 }}>{r.id}</td>
                    <td style={{ padding: '14px' }}>{r.target}</td>
                    <td style={{ padding: '14px' }}>{r.reason}</td>
                    <td style={{ padding: '14px', color: '#00dfd8' }}>@{r.reporter}</td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: r.status === 'PENDING' ? '#ff007a22' : '#00dfd822', color: r.status === 'PENDING' ? '#ff007a' : '#00dfd8', fontSize: '11px', fontWeight: 700 }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <button style={{ padding: '6px 12px', background: '#ff007a', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer', marginRight: '6px' }}>Remove Content</button>
                      <button style={{ padding: '6px 12px', background: '#332a63', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>Dismiss</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={{ background: '#1c1738', borderRadius: '12px', border: '1px solid #2e2652', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead style={{ background: '#15102e', borderBottom: '1px solid #2e2652', color: '#888' }}>
                <tr>
                  <th style={{ padding: '14px' }}>Username</th>
                  <th style={{ padding: '14px' }}>Role</th>
                  <th style={{ padding: '14px' }}>Reports</th>
                  <th style={{ padding: '14px' }}>Status</th>
                  <th style={{ padding: '14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #231b47' }}>
                    <td style={{ padding: '14px', fontWeight: 600 }}>@{u.username}</td>
                    <td style={{ padding: '14px' }}>{u.role}</td>
                    <td style={{ padding: '14px' }}>{u.reports}</td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: u.status === 'ACTIVE' ? '#00dfd822' : '#ff007a22', color: u.status === 'ACTIVE' ? '#00dfd8' : '#ff007a', fontSize: '11px', fontWeight: 700 }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <button style={{ padding: '6px 12px', background: u.status === 'ACTIVE' ? '#ff007a' : '#00dfd8', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Unsuspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'health' && (
          <div style={{ background: '#1c1738', padding: '24px', borderRadius: '12px', border: '1px solid #2e2652' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>System Diagnostics</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <li>✅ PostgreSQL 16: Connected (Active connection pool: 18)</li>
              <li>✅ Redis Cache: Connected (Latency: 1.2ms)</li>
              <li>✅ MinIO S3 Object Storage: Connected (Bucket: socialx-media)</li>
              <li>✅ Socket.IO WebSocket Engine: 0 dropped packets</li>
              <li>✅ FCM Push Gateway: Ready</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
