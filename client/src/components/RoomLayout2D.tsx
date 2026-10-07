import { useState, useMemo, useEffect, useRef } from 'react';
import type { Desk, Device, DeviceStatus } from '../types';
import { STATUS_TOKENS } from '../utils/roomGrouping';
import { gridPositions } from '../utils/deskLayout';
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
  desks: Desk[];
  roomName?: string;
  onDeviceClick: (device: Device) => void;
  selectedDeviceId?: number | null;
}

// Base canvas reference resolution (จุดเดิมของระบบ — scale ด้วย fit/zoom)
const BASE_W = 1000;
const BASE_H = 620;

interface DisplayDesk extends Desk {
  drawX: number;
  drawY: number;
}

export default function RoomLayout2D({
  devices,
  desks,
  roomName = '',
  onDeviceClick,
  selectedDeviceId,
}: RoomLayout2DProps) {
  const [viewMode, setViewMode] = useState<'floorplan' | 'grid'>('floorplan');
  const [statusFilter, setStatusFilter] = useState<'all' | DeviceStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredDevice, setHoveredDevice] = useState<Device | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fitScale, setFitScale] = useState<number | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerW = entry.contentRect.width;
        if (containerW > 0) setFitScale(containerW / BASE_W);
      }
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  const MAX_ZOOM = 2.2;
  const MIN_ZOOM = 0.7;
  const effectiveScale = fitScale !== null ? fitScale * zoomLevel : zoomLevel;
  const zoomPercent = Math.round(zoomLevel * 100);

  // ── สถานะเครื่องทั้งห้อง ──
  const stats = useMemo(
    () => ({
      total: devices.length,
      normal: devices.filter((d) => d.status === 'normal').length,
      broken: devices.filter((d) => d.status === 'broken').length,
      repair: devices.filter((d) => d.status === 'under_repair').length,
    }),
    [devices]
  );

  const deviceById = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);

  // ── ตัวกรอง ──
  const matchesFilter = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (d: Device) => {
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchQuery = !q || d.name.toLowerCase().includes(q) || d.id.toString().includes(q);
      return matchStatus && matchQuery;
    };
  }, [statusFilter, searchQuery]);

  const filterActive = statusFilter !== 'all' || searchQuery.trim().length > 0;

  // ── โต๊ะที่จะวาด: มีพิกัดจริง → ใช้เลย, ยังไม่มีสักโต๊ะ → กริดเต็มผัง ──
  const { displayDesks, stripDesks } = useMemo(() => {
    const placed: DisplayDesk[] = desks
      .filter((d) => d.x !== null && d.y !== null)
      .map((d) => ({ ...d, drawX: d.x!, drawY: d.y! }));
    const unplaced = desks.filter((d) => d.x === null || d.y === null);

    if (placed.length > 0) {
      return { displayDesks: placed, stripDesks: unplaced };
    }
    const positions = gridPositions(desks.length);
    return {
      displayDesks: desks.map((d, i) => ({
        ...d,
        drawX: positions[i]?.x ?? 50,
        drawY: positions[i]?.y ?? 50,
      })),
      stripDesks: [] as Desk[],
    };
  }, [desks]);

  // เครื่องที่ยังไม่ผูกโต๊ะ (deskId = null) → แสดงในแถบด้านล่าง
  const deskDeviceIds = useMemo(() => {
    const ids = new Set<number>();
    for (const d of desks) for (const dev of d.devices) ids.add(dev.id);
    return ids;
  }, [desks]);
  const looseDevices = useMemo(
    () => devices.filter((d) => !deskDeviceIds.has(d.id)),
    [devices, deskDeviceIds]
  );

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

  const canvasW = BASE_W * effectiveScale;
  const canvasH = BASE_H * effectiveScale;
  const hasStrip = stripDesks.length > 0 || looseDevices.length > 0;

  const renderChip = (device: Device, deskLabel?: string) => {
    if (!matchesFilter(device)) return null;
    const conf = STATUS_TOKENS[device.status] || STATUS_TOKENS.normal;
    const isSelected = selectedDeviceId === device.id;
    return (
      <button
        key={device.id}
        className={`rl2d-chip rl2d-status-${device.status} ${isSelected ? 'selected' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onDeviceClick(device);
        }}
        onMouseEnter={() => setHoveredDevice(device)}
        onMouseLeave={() => setHoveredDevice(null)}
        title={`${device.name} — ${conf.label}${deskLabel ? ` · ${deskLabel}` : ''}`}
      >
        <span className="rl2d-chip-dot" style={{ background: conf.border }} />
        <span className="rl2d-chip-name">{device.name}</span>
      </button>
    );
  };

  return (
    <div className="rl2d-wrapper">
      {/* Control Header */}
      <div className="rl2d-hdr">
        <div className="rl2d-title-box">
          <MapIcon size={18} color="#185FA5" />
          <span className="rl2d-title">ผังห้องแบบ 2D (Top-Down)</span>
          <span className="rl2d-tag">ห้อง {roomName}</span>
        </div>

        <div className="rl2d-actions">
          <div className="rl2d-search-wrap">
            <Search size={14} className="rl2d-search-icon" />
            <input
              type="text"
              className="rl2d-input"
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
            <span className="rl2d-badge rl2d-badge-neutral">{stats.total}</span>
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

        <div className="rl2d-hint-text">
          <Info size={13} color="#94A3B8" />
          คลิกที่ชื่อเครื่องบนโต๊ะเพื่อดูรายละเอียด / แจ้งซ่อม
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'floorplan' ? (
        <>
          <div className="rl2d-stage" ref={stageRef}>
            <div
              className="rl2d-canvas-outer"
              style={{
                width: fitScale !== null ? canvasW : '100%',
                height: fitScale !== null ? canvasH : BASE_H,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <div
                className="rl2d-fixed-canvas"
                style={{
                  width: BASE_W,
                  height: BASE_H,
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: 'top left',
                }}
              >
                {/* Decorative layers (ไม่ได้เก็บใน DB) */}
                <div className="rl2d-screen-bar">
                  <span className="rl2d-screen-text">
                    <Monitor size={13} color="#185FA5" /> กระดาน / จอภาพหน้าห้อง
                  </span>
                </div>
                <div className="rl2d-teacher-box">
                  <Monitor size={14} color="#0284C7" /> โต๊ะผู้สอน
                </div>
                <div className="rl2d-door-bar" />
                <div className="rl2d-door-text">
                  <DoorOpen size={14} color="#B45309" /> ประตูทางเข้า
                </div>
                <div className="rl2d-window-bar" />

                {/* โต๊ะจริงจาก DB (x/y %) */}
                {displayDesks.map((desk) => {
                  const visibleCount = desk.devices.filter((d) => {
                    const dev = deviceById.get(d.id);
                    return dev ? matchesFilter(dev) : false;
                  }).length;
                  const dimmed = filterActive && desk.devices.length > 0 && visibleCount === 0;

                  return (
                    <div
                      key={desk.id}
                      className={`rl2d-desk ${dimmed ? 'is-dimmed' : ''} ${
                        desk.devices.length === 0 ? 'is-empty' : ''
                      }`}
                      style={{
                        left: `${(desk.drawX / 100) * BASE_W}px`,
                        top: `${(desk.drawY / 100) * BASE_H}px`,
                      }}
                    >
                      <div className="rl2d-desk-label">{desk.label}</div>
                      <div className="rl2d-desk-chips">
                        {desk.devices.map((d) => {
                          const dev = deviceById.get(d.id);
                          if (!dev) return null;
                          return renderChip(dev, desk.label);
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hover Tooltip */}
            {hoveredDevice && (
              <div className="rl2d-tooltip">
                <div className="rl2d-tooltip-name">
                  <Monitor size={14} color="#60A5FA" /> {hoveredDevice.name}
                </div>
                <div
                  className="rl2d-tooltip-status"
                  style={{
                    color:
                      STATUS_TOKENS[hoveredDevice.status]?.border || '#10B981',
                  }}
                >
                  สถานะ: {renderStatusIcon(hoveredDevice.status, 12)}{' '}
                  {STATUS_TOKENS[hoveredDevice.status]?.label || 'ปกติ'}
                </div>
                <div className="rl2d-tooltip-coord">
                  {deskLabelOf(desks, hoveredDevice.id) ?? 'ยังไม่มีโต๊ะ'}
                </div>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="rl2d-zoom-wrap">
              <button
                className="rl2d-zoom-btn"
                onClick={() =>
                  setZoomLevel((z) => Math.min(MAX_ZOOM, parseFloat((z + 0.1).toFixed(2))))
                }
                title="ขยาย"
              >
                <Plus size={16} />
              </button>
              <button
                className="rl2d-zoom-btn"
                onClick={() =>
                  setZoomLevel((z) => Math.max(MIN_ZOOM, parseFloat((z - 0.1).toFixed(2))))
                }
                title="ย่อ"
              >
                <Minus size={16} />
              </button>
              <button
                className="rl2d-zoom-btn rl2d-zoom-reset"
                onClick={() => setZoomLevel(1)}
                title="รีเซ็ตพอดีจอ"
              >
                <RotateCcw size={13} /> {zoomPercent}%
              </button>
            </div>
          </div>

          {/* โต๊ะ/เครื่องที่ยังไม่อยู่บนผัง */}
          {hasStrip && (
            <div className="rl2d-strip">
              <div className="rl2d-strip-title">
                <Info size={13} /> ยังไม่ได้จัดบนผัง ({stripDesks.length} โต๊ะ ·{' '}
                {looseDevices.length} เครื่อง)
              </div>
              <div className="rl2d-strip-list">
                {stripDesks.map((desk) => (
                  <div key={desk.id} className="rl2d-strip-desk">
                    <span className="rl2d-strip-desk-label">{desk.label}</span>
                    <div className="rl2d-strip-chips">
                      {desk.devices.map((d) => {
                        const dev = deviceById.get(d.id);
                        if (!dev) return null;
                        return renderChip(dev, desk.label);
                      })}
                      {desk.devices.length === 0 && <span className="rl2d-strip-empty">ว่าง</span>}
                    </div>
                  </div>
                ))}
                {looseDevices.length > 0 && (
                  <div className="rl2d-strip-desk rl2d-strip-loose">
                    <span className="rl2d-strip-desk-label">ไม่มีโต๊ะ</span>
                    <div className="rl2d-strip-chips">
                      {looseDevices.map((d) => renderChip(d, 'ไม่มีโต๊ะ'))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Grid / List View */
        <div className="rl2d-grid-wrap">
          {devices.filter(matchesFilter).map((device) => {
            const conf = STATUS_TOKENS[device.status] || STATUS_TOKENS.normal;
            const isSelected = selectedDeviceId === device.id;
            return (
              <div
                key={device.id}
                className={`rl2d-grid-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onDeviceClick(device)}
              >
                <div
                  className="rl2d-grid-icon"
                  style={{ background: conf.bgTint, border: `1px solid ${conf.border}` }}
                >
                  {renderStatusIcon(device.status, 16)}
                </div>
                <div className="rl2d-grid-name">{device.name.replace(/^PC-/i, '')}</div>
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

function deskLabelOf(desks: Desk[], deviceId: number): string | null {
  for (const d of desks) {
    if (d.devices.some((dev) => dev.id === deviceId)) return `โต๊ะ: ${d.label}`;
  }
  return null;
}
