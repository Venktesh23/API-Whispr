import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Activity, Zap, TrendingUp } from 'lucide-react';

const MonitoringDashboard = () => {
  const [metrics, setMetrics] = useState({
    apiHealth: 100,
    responseTime: 245,
    uptime: 99.99,
    activeUsers: 0,
    totalRequests: 0,
    errorRate: 0,
  });

  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(prev => ({ ...prev, ...data }));
          setHistory(prev => [
            { timestamp: new Date(), ...data },
            ...prev.slice(0, 59)
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Fetch every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (health) => {
    if (health >= 95) return 'text-green-500';
    if (health >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBgColor = (health) => {
    if (health >= 95) return 'bg-green-50';
    if (health >= 80) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {/* API Health Score */}
      <div className={`rounded-lg border-2 border-gray-200 p-6 ${getHealthBgColor(metrics.apiHealth)}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">API Health</h3>
          <CheckCircle className={`w-6 h-6 ${getHealthColor(metrics.apiHealth)}`} />
        </div>
        <div className={`text-4xl font-bold ${getHealthColor(metrics.apiHealth)}`}>
          {metrics.apiHealth.toFixed(1)}%
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {metrics.apiHealth >= 95 ? 'Excellent' : metrics.apiHealth >= 80 ? 'Good' : 'Needs Attention'}
        </div>
      </div>

      {/* Response Time */}
      <div className="rounded-lg border-2 border-gray-200 p-6 bg-blue-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Response Time</h3>
          <Zap className="w-6 h-6 text-blue-500" />
        </div>
        <div className="text-4xl font-bold text-blue-600">
          {metrics.responseTime}ms
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {metrics.responseTime < 300 ? 'Fast' : metrics.responseTime < 500 ? 'Normal' : 'Slow'}
        </div>
      </div>

      {/* Uptime */}
      <div className="rounded-lg border-2 border-gray-200 p-6 bg-purple-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Uptime</h3>
          <Activity className="w-6 h-6 text-purple-500" />
        </div>
        <div className="text-4xl font-bold text-purple-600">
          {metrics.uptime.toFixed(2)}%
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Last 30 days
        </div>
      </div>

      {/* Active Users */}
      <div className="rounded-lg border-2 border-gray-200 p-6 bg-orange-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Active Users</h3>
          <TrendingUp className="w-6 h-6 text-orange-500" />
        </div>
        <div className="text-4xl font-bold text-orange-600">
          {metrics.activeUsers}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Currently online
        </div>
      </div>

      {/* Total Requests */}
      <div className="rounded-lg border-2 border-gray-200 p-6 bg-indigo-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Total Requests</h3>
          <Activity className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="text-4xl font-bold text-indigo-600">
          {(metrics.totalRequests / 1000).toFixed(1)}K
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Today
        </div>
      </div>

      {/* Error Rate */}
      <div className={`rounded-lg border-2 border-gray-200 p-6 ${metrics.errorRate > 5 ? 'bg-red-50' : 'bg-green-50'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Error Rate</h3>
          <AlertCircle className={`w-6 h-6 ${metrics.errorRate > 5 ? 'text-red-500' : 'text-green-500'}`} />
        </div>
        <div className={`text-4xl font-bold ${metrics.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
          {metrics.errorRate.toFixed(2)}%
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {metrics.errorRate > 5 ? 'High' : 'Low'}
        </div>
      </div>

      {/* Charts Section - Placeholder */}
      <div className="col-span-full rounded-lg border-2 border-gray-200 p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Metrics History</h3>
        {history.length > 0 ? (
          <div className="text-center text-gray-600">
            <p>Historical data visualization (last {history.length} entries)</p>
            <p className="text-sm mt-2">Chart library integration recommended for visual display</p>
          </div>
        ) : (
          <p className="text-gray-600 text-center">Loading historical data...</p>
        )}
      </div>
    </div>
  );
};

export default MonitoringDashboard;
