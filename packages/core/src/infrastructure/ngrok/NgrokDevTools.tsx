/**
 * Ngrok Development Tools for Katalyst
 *
 * Provides development utilities, tunnel management, and team collaboration features
 */

import React, { useState, useEffect } from 'react';
import { useNgrok } from './NgrokProvider';

interface NgrokDevToolsProps {
  showQRCodes?: boolean;
  enableTeamSharing?: boolean;
  autoRefresh?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function NgrokDevTools({
  showQRCodes = true,
  enableTeamSharing = true,
  autoRefresh = true,
  position = 'bottom-right',
}: NgrokDevToolsProps) {
  const {
    getTunnels,
    createTunnel,
    destroyTunnel,
    generateQRCode,
    notifyTeam,
    copyToClipboard,
    getTunnelMetrics,
  } = useNgrok();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTunnel, setSelectedTunnel] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<any>(null);

  const tunnels = getTunnels();

  // Auto-refresh metrics
  useEffect(() => {
    if (selectedTunnel && autoRefresh) {
      const interval = setInterval(async () => {
        try {
          const tunnelMetrics = await getTunnelMetrics(selectedTunnel);
          setMetrics(tunnelMetrics);
        } catch (error) {
          console.warn('Failed to fetch tunnel metrics:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedTunnel, autoRefresh, getTunnelMetrics]);

  useEffect(() => {
    // Generate QR codes for mobile tunnels
    if (showQRCodes) {
      tunnels.forEach(async (tunnel) => {
        if (tunnel.config.name?.includes('mobile') && !qrCodes[tunnel.id]) {
          try {
            const qrCode = await generateQRCode(tunnel.publicUrl);
            setQrCodes((prev) => ({ ...prev, [tunnel.id]: qrCode }));
          } catch (error) {
            console.warn('Failed to generate QR code:', error);
          }
        }
      });
    }
  }, [tunnels, showQRCodes, generateQRCode, qrCodes]);

  const handleShareTunnel = async (tunnel: any) => {
    try {
      await copyToClipboard(tunnel.publicUrl);

      if (enableTeamSharing) {
        await notifyTeam(`🔗 ${tunnel.config.name || 'Tunnel'} shared: ${tunnel.publicUrl}`);
      }
    } catch (error) {
      console.warn('Failed to share tunnel:', error);
    }
  };

  const positionStyles = {
    'top-left': { top: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'bottom-right': { bottom: 20, right: 20 },
  };

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 10000,
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        minWidth: isExpanded ? '400px' : '120px',
        transition: 'all 0.3s ease',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: tunnels.length > 0 ? '#22c55e' : '#ef4444',
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>ngrok ({tunnels.length})</span>
        </div>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{isExpanded ? '−' : '+'}</span>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {/* Tunnel List */}
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              Active Tunnels
            </h4>

            {tunnels.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>No active tunnels</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tunnels.map((tunnel) => (
                  <div
                    key={tunnel.id}
                    style={{
                      padding: '8px',
                      backgroundColor: selectedTunnel === tunnel.id ? '#f3f4f6' : 'transparent',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedTunnel(tunnel.id)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>
                          {tunnel.config.name || `Port ${tunnel.config.addr}`}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: '#6b7280',
                            wordBreak: 'break-all',
                            maxWidth: '200px',
                          }}
                        >
                          {tunnel.publicUrl}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        {/* Copy Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareTunnel(tunnel);
                          }}
                          style={{
                            padding: '4px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                          title="Copy & Share"
                        >
                          📋
                        </button>

                        {/* QR Code Button */}
                        {showQRCodes && qrCodes[tunnel.id] && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(qrCodes[tunnel.id], '_blank');
                            }}
                            style={{
                              padding: '4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '10px',
                            }}
                            title="QR Code"
                          >
                            📱
                          </button>
                        )}

                        {/* Destroy Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            destroyTunnel(tunnel.id);
                          }}
                          style={{
                            padding: '4px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '10px',
                            color: '#ef4444',
                          }}
                          title="Destroy Tunnel"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tunnel Metrics */}
          {selectedTunnel && metrics && (
            <div style={{ marginBottom: '16px' }}>
              <h4
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  margin: '0 0 8px 0',
                }}
              >
                Metrics
              </h4>
              <div
                style={{
                  padding: '8px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                <div>Requests: {metrics.requests}</div>
                <div>Bandwidth: {formatBytes(metrics.bandwidth)}</div>
                <div>Latency P99: {metrics.latency.p99}ms</div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              Quick Actions
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => createTunnel(3000, { name: 'web' })}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                + Web (3000)
              </button>
              <button
                onClick={() => createTunnel(3001, { name: 'shared' })}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                + Shared (3001)
              </button>
              <button
                onClick={() => createTunnel(3002, { name: 'mobile' })}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  backgroundColor: '#06b6d4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                + Mobile (3002)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
