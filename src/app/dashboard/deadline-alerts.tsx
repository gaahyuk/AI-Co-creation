"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Alert {
  id: string;
  title: string;
  category: string;
  applyEnd: string;
  daysLeft: number;
  urgent: boolean;
}

export function DeadlineAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch("/api/notifications/deadline-alerts");
        if (response.ok) {
          const data = await response.json();
          setAlerts(data.alerts);
        }
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  if (loading) {
    return <div className="text-center text-slate-500">불러오는 중...</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg bg-emerald-50 p-6 text-center">
        <p className="text-emerald-700">⏰ 마감임박 정책이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Link
          key={alert.id}
          href={`/policies/${alert.id}`}
          className={`block rounded-lg p-4 transition-all hover:shadow-md ${
            alert.urgent
              ? "border border-red-200 bg-red-50"
              : "border border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{alert.title}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {alert.category} ·
                {new Date(alert.applyEnd).toLocaleDateString("ko-KR")} 마감
              </p>
            </div>
            <div
              className={`whitespace-nowrap rounded-full px-3 py-1 text-center text-sm font-bold ${
                alert.urgent
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              D-{alert.daysLeft}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
