'use client';
import { useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Shield, Server, Cpu, Database, HardDrive } from 'lucide-react';

interface CheckItem {
  name: string;
  key: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  detail?: string;
}

interface EnvReport {
  success: boolean;
  timestamp: string;
  hostname: string;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  summary: { total: number; pass: number; fail: number; warning: number };
  checks: CheckItem[];
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; bg: string; border: string; label: string }> = {
  pass: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: '正常' },
  fail: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: '异常' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: '警告' },
};

const KEY_ICON: Record<string, typeof Shield> = {
  python: Server,
  ffmpeg: HardDrive,
  openai: Cpu,
  elevenlabs: Cpu,
  ark: Cpu,
  node: Server,
  database: Database,
  redis: Database,
  license: Shield,
};

export default function EnvironmentPage() {
  const [report, setReport] = useState<EnvReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/environment/check');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EnvReport = await res.json();
      setReport(data);
    } catch (e: any) {
      setError(e.message || '检查失败，请确认后端服务已启动');
    } finally {
      setLoading(false);
    }
  }, []);

  const overallConfig = (() => {
    if (!report) return null;
    switch (report.overall) {
      case 'healthy': return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: '系统健康', desc: '所有核心服务正常运行' };
      case 'degraded': return { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: '部分降级', desc: '存在警告项，部分功能可能受限' };
      case 'unhealthy': return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: '需要修复', desc: '存在失败项，核心功能不可用' };
    }
  })();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield size={24} /> 系统环境检测
          </h2>
          <p className="text-gray-500 text-sm mt-1">一键检查运行环境、API 密钥和许可证状态</p>
        </div>
        <button
          onClick={runCheck}
          disabled={loading}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-all shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? '检测中...' : report ? '重新检测' : '环境检测'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <Shield size={48} className="text-gray-300 mb-3" />
          <p className="text-gray-500 text-lg font-medium">尚未执行环境检测</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">点击上方的「环境检测」按钮开始检查</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !report && (
        <div className="card flex flex-col items-center justify-center py-20">
          <RefreshCw size={32} className="animate-spin text-brand-500 mb-3" />
          <p className="text-gray-500">正在检测环境...</p>
        </div>
      )}

      {report && (
        <>
          {/* Overall Status Banner */}
          {overallConfig && (
            <div className={`mb-6 p-5 rounded-xl border ${overallConfig.bg} flex items-center gap-4`}>
              <overallConfig.icon size={36} className={overallConfig.color} />
              <div>
                <p className={`text-lg font-bold ${overallConfig.color}`}>{overallConfig.label}</p>
                <p className="text-sm text-gray-600">{overallConfig.desc}</p>
              </div>
              <div className="ml-auto text-right text-xs text-gray-400">
                <p>{report.hostname}</p>
                <p>{new Date(report.timestamp).toLocaleString('zh-CN')}</p>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="card text-center py-3">
              <p className="text-2xl font-bold text-gray-800">{report.summary.total}</p>
              <p className="text-xs text-gray-500">总检查项</p>
            </div>
            <div className="card text-center py-3 border-green-200">
              <p className="text-2xl font-bold text-green-600">{report.summary.pass}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><CheckCircle size={12} /> 通过</p>
            </div>
            <div className="card text-center py-3 border-yellow-200">
              <p className="text-2xl font-bold text-yellow-600">{report.summary.warning}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><AlertTriangle size={12} /> 警告</p>
            </div>
            <div className="card text-center py-3 border-red-200">
              <p className="text-2xl font-bold text-red-600">{report.summary.fail}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><XCircle size={12} /> 失败</p>
            </div>
          </div>

          {/* Detail Checks */}
          <div className="grid gap-2">
            {report.checks.map((check) => {
              const config = STATUS_CONFIG[check.status];
              const IconComp = config.icon;
              const KeyIcon = KEY_ICON[check.key] || Server;
              return (
                <div key={check.key} className={`card border-l-4 ${config.border} ${config.bg} flex items-center gap-3 px-4 py-3`}>
                  <KeyIcon size={20} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">{check.name}</p>
                    <p className="text-xs text-gray-500">{check.message}</p>
                    {check.detail && <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{check.detail}</p>}
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color} ${config.bg} border ${config.border}`}>
                    <IconComp size={14} />
                    <span>{config.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
