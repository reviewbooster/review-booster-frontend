import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "../../../components/DashboardLayout";
import withAuth from "../../../components/withAuth";
import api from "../../../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

function KpiCard({ icon, iconBg, value, label, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={"w-9 h-9 rounded-xl flex items-center justify-center mb-3 text-base " + iconBg}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [actionCenter, setActionCenter] = useState(null);
  const [businessHealth, setBusinessHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/admin/dashboard-stats").catch(() => ({ data: {} })),
      api.get("/api/admin/action-center").catch(() => ({ data: { items: [] } })),
      api.get("/api/admin/business-health").catch(() => ({ data: {} }))
    ]).then(([s, a, h]) => {
      setStats(s.data);
      setActionCenter(a.data);
      setBusinessHealth(h.data);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Good morning, Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Platform overview</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon="🏢" iconBg="bg-blue-50" value={stats.total_businesses || 0} label="Businesses" sub={"+0 this month"} />
              <KpiCard icon="💳" iconBg="bg-purple-50" value="₹0" label="MRR" sub="0 paying" />
              <KpiCard icon="⭐" iconBg="bg-amber-50" value={stats.total_reviews || 0} label="Reviews" sub="+0 this month" />
              <KpiCard icon="⚠️" iconBg="bg-green-50" value="0" label="Issues" sub="All clear" />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-4">Action Center</p>
                {actionCenter?.items?.length > 0 ? (
                  actionCenter.items.map((item, i) => (
                    <div key={i} className="flex justify-between p-3 mb-2 hover:bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                      <Link href={item.href || "#"} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded whitespace-nowrap">{item.buttonLabel}</Link>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">No action items 🎉</p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-4">Business Health</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{businessHealth?.healthy || 0}</p>
                    <p className="text-[11px] text-gray-500">Healthy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{businessHealth?.attention || 0}</p>
                    <p className="text-[11px] text-gray-500">Attention</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{businessHealth?.at_risk || 0}</p>
                    <p className="text-[11px] text-gray-500">At Risk</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(DashboardPage);
