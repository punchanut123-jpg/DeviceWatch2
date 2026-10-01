import { useState, useMemo, useEffect, useRef } from 'react';
import type { Device, DeviceStatus } from '../types';
import {
  groupDevicesIntoPairsAndRows,
  STATUS_TOKENS,
} from '../utils/roomGrouping';
import {
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Monitor,
  DoorOpen,
  Search,
  LayoutGrid,
  Map as MapIcon,
  Plus,
  Minus,
  RotateCcw,
  Info,
} from 'lucide-react';

interface RoomLayout2DProps {
  devices: Device[];
  roomName?: string;
  onDeviceClick: (device: Device) => void;
  selectedDeviceId?: number | null;
}

export default function RoomLayout2D({
  devices,
  roomName = '26201',
  onDeviceClick,
  selectedDeviceId,
}: RoomLayout2DProps) {
  const [viewMode, setViewMode] = useState<'floorplan' | 'grid'>('floorplan');
  const [statusFilter, setStatusFilter] = useState<'all' | DeviceStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredDevice, setHoveredDevice] = useState<Device | null>(null);
  // zoomLevel: 1.0 = fit-to-container, higher = zoomed in
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fitScale, setFitScale] = useState<number | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);

  // ── ResizeObserver: measure container width, compute fitScale ──
  useEffect(() => {
    if (!stageRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerW = entry.contentRect.width;
        if (containerW > 0) {
          const computed = containerW / 1000; // base canvas = 1000px wide
          setFitScale(computed);
        }
      }
    });

    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  // effective pixel scale = fitScale * zoomLevel (capped to 2.2x fit)
  const MAX_ZOOM = 2.2;
  const MIN_ZOOM = 0.7;
  const effectiveScale = fitScale !== null ? fitScale * zoomLevel : zoomLevel;

  // zoom percent relative to "fit" (1.0 zoom = 100%)
  const zoomPercent = Math.round(zoomLevel * 100);

  // Group devices using pure utility function (1000x620px base reference resolution)
  const groupedData = useMemo(() => {
    return groupDevicesIntoPairsAndRows(devices, {
      baseWidth: 1000,
      baseHeight: 620,
    });
  }, [devices]);

  const { stats, allDevices, rows, baseWidth, baseHeight } = groupedData;

  // Filter devices based on status filter & search query
  const filteredDevices = useMemo(() => {
    return allDevices.filter((d) => {
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchQuery =
        !searchQuery.trim() ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        d.id.toString().includes(searchQuery.trim());
      return matchStatus && matchQuery;
    });
  }, [allDevices, statusFilter, searchQuery]);

  const filteredIds = useMemo(() => {
    return new Set(filteredDevices.map((d) => d.id));
  }, [filteredDevices]);

  // Helper icon renderer for status
  const renderStatusIcon = (status: DeviceStatus, size: number = 13) => {
    const color = STATUS_TOKENS[status]?.border || '#10B981';
    switch (status) {
      case 'broken':
        return <AlertTriangle size={size} color={color} />;
      case 'under_repair':
        return <Wrench size={size} color={color} />;
      case 'normal':
      default:
        return <CheckCircle2 size={size} color={color} />;
    }
  };

  // Canvas dimensions at current effective scale
  const canvasW = baseWidth * effectiveScale;
  const canvasH = baseHeight * effectiveScale;

  return (
    <div className="rl2d-wrapper">
      {/* Control Header */}
      <div className="rl2d-hdr">
        <div className="rl2d-title-box">
          <MapIcon size={18} color="#185FA5" />
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>
            ผังห้องแบบ 2D (Top-Down)
          </span>
          <span className="rl2d-tag">ห้อง {roomName}</span>
        </div>

        <div className="rl2d-actions">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={14}
              color="#64748B"
              style={{ position: 'absolute', left: 10, pointerEvents: 'none' }}
            />
            <input
              type="text"
              className="rl2d-input"
              style={{ paddingLeft: 30 }}
              placeholder="ค้นหาเครื่อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rl2d-segmented">
            <button
              className={`rl2d-seg-btn ${viewMode === 'floorplan' ? 'active' : ''}`}
              onClick={() => setViewMode('floorplan')}
            >
              <MapIcon size={14} /> แผนผัง 2D
            </button>
            <button
              className={`rl2d-seg-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} /> Grid
            </button>
          </div>
        </div>
      </div>

      {/* Status Summary Bar & Quick Filters */}
      <div className="rl2d-summary">
        <div className="rl2d-pills">
          <button
            className={`rl2d-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            ทั้งหมด
            <span className="rl2d-badge" style={{ background: '#F1F5F9', color: '#0F172A' }}>
              {stats.total}
            </span>
          </button>

          <button
            className={`rl2d-pill ${statusFilter === 'normal' ? 'active' : ''}`}
            onClick={() => setStatusFilter('normal')}
          >
            <CheckCircle2 size={13} color={STATUS_TOKENS.normal.border} /> ปกติ
            <span
              className="rl2d-badge"
              style={{
                background: STATUS_TOKENS.normal.badgeBg,
                color: STATUS_TOKENS.normal.badgeText,
              }}
            >
              {stats.normal}
            </span>
          </button>

          <button
            className={`rl2d-pill ${statusFilter === 'broken' ? 'active' : ''}`}
            onClick={() => setStatusFilter('broken')}
          >
            <AlertTriangle size={13} color={STATUS_TOKENS.broken.border} /> เสีย
            <span
              className="rl2d-badge"
              style={{
                background: STATUS_TOKENS.broken.badgeBg,
                color: STATUS_TOKENS.broken.badgeText,
              }}
            >
              {stats.broken}
            </span>
          </button>

          <button
            className={`rl2d-pill ${statusFilter === 'under_repair' ? 'active' : ''}`}
            onClick={() => setStatusFilter('under_repair')}
          >
            <Wrench size={13} color={STATUS_TOKENS.under_repair.border} /> กำลังซ่อม
            <span
              className="rl2d-badge"
              style={{
                background: STATUS_TOKENS.under_repair.badgeBg,
                color: STATUS_TOKENS.under_repair.badgeText,
              }}
            >
              {stats.repair}
            </span>
          </button>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Info size={13} color="#94A3B8" />
          คลิกที่การ์ดเครื่องเพื่อดูรายละเอียด / แจ้งซ่อม
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'floorplan' ? (
        <div className="rl2d-stage" ref={stageRef}>
          {/*
            Outer wrapper sized to the scaled canvas dimensions.
            This prevents the stage from clipping the canvas when zoomed.
          */}
          <div
            className="rl2d-canvas-outer"
            style={{
              width: fitScale !== null ? canvasW : '100%',
              height: fitScale !== null ? canvasH : baseHeight,
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {/* Fixed Coordinate System Canvas (1000x620px, scaled from top-left) */}
            <div
              className="rl2d-fixed-canvas"
              style={{
                width: baseWidth,
                height: baseHeight,
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'top left',
              }}
            >
              {/* Non-DB Decorative Layer: Front Screen / Whiteboard Banner */}
              <div className="rl2d-screen-bar">
                <span className="rl2d-screen-text">
                  <Monitor size={13} color="#185FA5" /> กระดาน / จอภาพหน้าห้อง
                </span>
              </div>

              {/* Non-DB Decorative Layer: Teacher Podium */}
              <div className="rl2d-teacher-box">
                <Monitor size={14} color="#0284C7" /> โต๊ะผู้สอน
              </div>

              {/* Non-DB Decorative Layer: Entrance Door */}
              <div className="rl2d-door-bar" />
              <div className="rl2d-door-text">
                <DoorOpen size={14} color="#B45309" /> ประตูทางเข้า
              </div>

              {/* Non-DB Decorative Layer: Window Glass */}
              <div className="rl2d-window-bar" />

              {/* Render Paired Desk Containers at Exact Pixel Coordinates */}
              {rows.map((row) =>
                row.pairs.map((pair) => {
                  const hasVisibleDevice = pair.devices.some((d) => filteredIds.has(d.id));
                  if (!hasVisibleDevice) return null;

                  return (
                    <div
                      key={pair.id}
                      className="rl2d-pair-container"
                      style={{
                        left: `${pair.centerPixelX}px`,
                        top: `${pair.centerPixelY}px`,
                      }}
                    >
                      {pair.devices.map((device) => {
                        if (!filteredIds.has(device.id)) return null;

                        const conf = STATUS_TOKENS[device.status] || STATUS_TOKENS.normal;
                        const isSelected = selectedDeviceId === device.id;
                        const devCode = device.name.replace(/^PC-/i, 'PC-');

                        return (
                          <div
                            key={device.id}
                            className={`rl2d-flat-card rl2d-status-${device.status} ${
                              isSelected ? 'selected' : ''
                            }`}
                            onClick={() => onDeviceClick(device)}
                            onMouseEnter={() => setHoveredDevice(device)}
                            onMouseLeave={() => setHoveredDevice(null)}
                            title={`${device.name} (${conf.label})`}
                          >
                            <div className="rl2d-icon-badge" style={{ background: conf.iconBg }}>
                              {renderStatusIcon(device.status, 13)}
                            </div>
                            <span className="rl2d-code">{devCode}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Hover Tooltip */}
          {hoveredDevice && (
            <div className="rl2d-tooltip">
              <div
                style={{
                  fontWeight: 700,
                  color: '#FFFFFF',
                  fontFamily: "'JetBrains Mono', monospace",
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Monitor size={14} color="#60A5FA" /> {hoveredDevice.name}
              </div>
              <div
                style={{
                  color: STATUS_TOKENS[hoveredDevice.status]?.border || '#10B981',
                  fontSize: '0.75rem',
                  marginTop: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                สถานะ: {renderStatusIcon(hoveredDevice.status, 12)}{' '}
                {STATUS_TOKENS[hoveredDevice.status]?.label || 'ปกติ'}
              </div>
              {hoveredDevice.posX !== null && hoveredDevice.posY !== null && (
                <div style={{ color: '#94A3B8', fontSize: '0.7rem', marginTop: 2 }}>
                  พิกัดจริง: ({hoveredDevice.posX}%, {hoveredDevice.posY}%)
                </div>
              )}
            </div>
          )}

          {/* Zoom Controls */}
          <div className="rl2d-zoom-wrap">
            <button
              className="rl2d-zoom-btn"
              onClick={() => setZoomLevel((z) => Math.min(MAX_ZOOM, parseFloat((z + 0.1).toFixed(2))))}
              title="ขยาย"
            >
              <Plus size={16} />
            </button>
            <button
              className="rl2d-zoom-btn"
              onClick={() => setZoomLevel((z) => Math.max(MIN_ZOOM, parseFloat((z - 0.1).toFixed(2))))}
              title="ย่อ"
            >
              <Minus size={16} />
            </button>
            <button
              className="rl2d-zoom-btn"
              onClick={() => setZoomLevel(1)}
              style={{ fontSize: '0.7rem', fontWeight: 600, width: 'auto', padding: '0 8px' }}
              title="รีเซ็ตพอดีจอ"
            >
              <RotateCcw size={13} style={{ marginRight: 3 }} /> {zoomPercent}%
            </button>
          </div>
        </div>
      ) : (
        /* Grid / List View */
        <div className="rl2d-grid-wrap">
          {filteredDevices.map((device) => {
            const conf = STATUS_TOKENS[device.status] || STATUS_TOKENS.normal;
            const isSelected = selectedDeviceId === device.id;
            return (
              <div
                key={device.id}
                className="rl2d-grid-item"
                onClick={() => onDeviceClick(device)}
                style={{
                  borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                }}
              >
                <div
                  className="rl2d-grid-icon"
                  style={{
                    background: conf.bgTint,
                    border: `1px solid ${conf.border}`,
                  }}
                >
                  {renderStatusIcon(device.status, 16)}
                </div>
                <div className="rl2d-grid-name">
                  {device.name.replace(/^PC-/i, '')}
                </div>
                <div className="rl2d-grid-status" style={{ color: conf.text }}>
                  {conf.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
