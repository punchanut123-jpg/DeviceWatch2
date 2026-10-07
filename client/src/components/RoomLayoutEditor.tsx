import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ApplyLayoutPreview,
  ApplyLayoutResult,
  Desk,
  Device,
  LayoutSavePayload,
  LayoutSaveResult,
} from '../types';
import { gridPositions, nextDeskNumber } from '../utils/deskLayout';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Monitor,
  Move,
  PlusCircle,
  RotateCcw,
  Save,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';

/** สถานะโต๊ะระหว่างแก้ไข (id ไม่มี = โต๊ะที่เพิ่งสร้าง ยังไม่ได้บันทึก) */
interface EditorDesk {
  key: string;
  id?: number;
  label: string;
  x: number | null;
  y: number | null;
  deviceIds: number[];
}

interface RoomLayoutEditorProps {
  roomId?: number;
  roomName: string;
  initialDesks: Desk[];
  initialDevices: Device[];
  allRooms?: Array<{ id: number; name: string; floor: { number: number } }>;
  onSelectRoom?: (roomId: number) => void;
  onSave: (payload: LayoutSavePayload) => Promise<LayoutSaveResult>;
  onApplyLayout: (sourceRoomId: number, confirm: boolean) => Promise<ApplyLayoutResult>;
  onBack?: () => void;
}

type DragState =
  | { type: 'desk'; key: string }
  | { type: 'device'; deviceId: number };

const CLAMP_MIN = 3;
const CLAMP_MAX = 95;

function toEditorDesks(list: Desk[]): EditorDesk[] {
  return list.map((d) => ({
    key: `d-${d.id}`,
    id: d.id,
    label: d.label,
    x: d.x,
    y: d.y,
    deviceIds: d.devices.map((dev) => dev.id),
  }));
}

function buildPayload(
  desks: EditorDesk[],
  deletedIds: number[],
  allDevices: Device[]
): LayoutSavePayload {
  const assigned = new Set(desks.flatMap((d) => d.deviceIds));
  const pool = allDevices.filter((dev) => !assigned.has(dev.id));
  return {
    desks: desks.map((d) =>
      d.id !== undefined
        ? { id: d.id, label: d.label, x: d.x, y: d.y }
        : { label: d.label, x: d.x, y: d.y }
    ),
    deleteIds: deletedIds,
    assignments: [
      ...desks.flatMap((d, idx) =>
        d.deviceIds.map((deviceId) => ({ deviceId, deskIndex: idx }))
      ),
      ...pool.map((dev) => ({ deviceId: dev.id, deskIndex: null })),
    ],
  };
}

function errText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function RoomLayoutEditor({
  roomId,
  roomName,
  initialDesks,
  initialDevices,
  allRooms,
  onSelectRoom,
  onSave,
  onApplyLayout,
  onBack,
}: RoomLayoutEditorProps) {
  const [desks, setDesks] = useState<EditorDesk[]>(() => toEditorDesks(initialDesks));
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [dragOverCanvas, setDragOverCanvas] = useState(false);
  const [dragOverPalette, setDragOverPalette] = useState(false);
  const [deskTargetKey, setDeskTargetKey] = useState<string | null>(null);

  const [showApply, setShowApply] = useState(false);
  const [sourceId, setSourceId] = useState<number | ''>('');
  const [preview, setPreview] = useState<ApplyLayoutPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyErr, setApplyErr] = useState('');
  const [applyBusy, setApplyBusy] = useState(false);

  const dragRef = useRef<DragState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const tempCounter = useRef(0);

  // โหลดข้อมูลใหม่จาก server (หลังบันทึก/คัดลอก หน้าหลักจะ refetch แล้วส่ง props ใหม่มา)
  useEffect(() => {
    setDesks(toEditorDesks(initialDesks));
    setDeletedIds([]);
    setSelectedKey(null);
  }, [initialDesks]);

  const deviceById = useMemo(
    () => new Map(initialDevices.map((d) => [d.id, d])),
    [initialDevices]
  );
  const assignedIds = useMemo(
    () => new Set(desks.flatMap((d) => d.deviceIds)),
    [desks]
  );
  const pool = useMemo(
    () => initialDevices.filter((d) => !assignedIds.has(d.id)),
    [initialDevices, assignedIds]
  );
  const unplaced = desks.filter((d) => d.x === null);
  const placed = desks.filter((d) => d.x !== null);
  const selected = desks.find((d) => d.key === selectedKey) ?? null;

  const initialJson = useMemo(
    () => JSON.stringify(buildPayload(toEditorDesks(initialDesks), [], initialDevices)),
    [initialDesks, initialDevices]
  );
  const currentJson = useMemo(
    () => JSON.stringify(buildPayload(desks, deletedIds, initialDevices)),
    [desks, deletedIds, initialDevices]
  );
  const dirty = initialJson !== currentJson;

  // ── ดึงข้อมูลตัวอย่างก่อนยืนยันคัดลอกผัง ──
  useEffect(() => {
    if (!showApply || sourceId === '') {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreview(null);
    setPreviewLoading(true);
    setApplyErr('');
    onApplyLayout(Number(sourceId), false)
      .then((res) => {
        if (!cancelled) setPreview(res.preview);
      })
      .catch((err: unknown) => {
        if (!cancelled) setApplyErr(errText(err, 'โหลดตัวอย่างไม่สำเร็จ'));
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showApply, sourceId, onApplyLayout]);

  // ── Drag & Drop ──────────────────────────────────────────
  const startDeskDrag = useCallback((e: React.DragEvent, key: string) => {
    dragRef.current = { type: 'desk', key };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  }, []);

  const startDeviceDrag = useCallback((e: React.DragEvent, deviceId: number) => {
    e.stopPropagation();
    dragRef.current = { type: 'device', deviceId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(deviceId));
  }, []);

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCanvas(true);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCanvas(false);
    const drag = dragRef.current;
    if (!drag || drag.type !== 'desk' || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const x = Math.round(Math.min(CLAMP_MAX, Math.max(CLAMP_MIN, rawX)) * 10) / 10;
    const y = Math.round(Math.min(CLAMP_MAX, Math.max(CLAMP_MIN, rawY)) * 10) / 10;

    setDesks((prev) => prev.map((d) => (d.key === drag.key ? { ...d, x, y } : d)));
    setSelectedKey(drag.key);
    dragRef.current = null;
  };

  const handlePaletteDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPalette(true);
  };

  const handlePaletteDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPalette(false);
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.type === 'desk') {
      setDesks((prev) =>
        prev.map((d) => (d.key === drag.key ? { ...d, x: null, y: null } : d))
      );
      setSelectedKey(drag.key);
    } else {
      // ดึงเครื่องออกจากโต๊ะ → กลับเป็น "ยังไม่มีโต๊ะ"
      setDesks((prev) =>
        prev.map((d) =>
          d.deviceIds.includes(drag.deviceId)
            ? { ...d, deviceIds: d.deviceIds.filter((id) => id !== drag.deviceId) }
            : d
        )
      );
    }
    dragRef.current = null;
  };

  const handleDeskDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragRef.current?.type === 'device') setDeskTargetKey(key);
  };

  const handleDeskDrop = (e: React.DragEvent, key: string) => {
    const drag = dragRef.current;
    // ถ้าเป็นการลาก "โต๊ะ" ให้ event เด้งขึ้น canvas ไปจัดการวางพิกัดต่อ
    if (!drag || drag.type !== 'device') return;

    e.preventDefault();
    e.stopPropagation();
    setDeskTargetKey(null);

    setDesks((prev) =>
      prev.map((d) => {
        const without = d.deviceIds.filter((id) => id !== drag.deviceId);
        if (d.key === key) return { ...d, deviceIds: [...without, drag.deviceId] };
        return d.deviceIds.includes(drag.deviceId) ? { ...d, deviceIds: without } : d;
      })
    );
    setSelectedKey(key);
    dragRef.current = null;
  };

  const handleDragEnd = () => {
    dragRef.current = null;
    setDragOverCanvas(false);
    setDragOverPalette(false);
    setDeskTargetKey(null);
  };

  // ── การแก้ไข ─────────────────────────────────────────────
  const handleAddDesk = () => {
    const label = `โต๊ะ ${String(nextDeskNumber(desks.map((d) => d.label))).padStart(2, '0')}`;
    const key = `t-${++tempCounter.current}`;
    setDesks((prev) => [...prev, { key, label, x: null, y: null, deviceIds: [] }]);
    setSelectedKey(key);
    setMsg(null);
  };

  const handleAutoArrange = () => {
    if (unplaced.length === 0) return;
    const positions = gridPositions(unplaced.length);
    let i = 0;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.x !== null) return d;
        const p = positions[i++];
        return { ...d, x: p.x, y: p.y };
      })
    );
    setMsg({
      type: 'success',
      text: `เรียงโต๊ะที่ยังไม่วาง ${unplaced.length} ตัวแล้ว — ตรวจผังก่อนกดบันทึก`,
    });
  };

  const handleDeleteDesk = (desk: EditorDesk) => {
    const deviceCount = desk.deviceIds.length;
    const question =
      deviceCount > 0
        ? `ลบ ${desk.label}? เครื่อง ${deviceCount} ตัวจะกลายเป็น "ยังไม่มีโต๊ะ"`
        : `ลบ ${desk.label}?`;
    if (!window.confirm(question)) return;

    setDesks((prev) => prev.filter((d) => d.key !== desk.key));
    if (desk.id !== undefined) setDeletedIds((prev) => [...prev, desk.id!]);
    if (selectedKey === desk.key) setSelectedKey(null);
  };

  const handleLabelChange = (key: string, label: string) => {
    setDesks((prev) => prev.map((d) => (d.key === key ? { ...d, label } : d)));
  };

  const handleUnassignDevice = (deviceId: number) => {
    setDesks((prev) =>
      prev.map((d) =>
        d.deviceIds.includes(deviceId)
          ? { ...d, deviceIds: d.deviceIds.filter((id) => id !== deviceId) }
          : d
      )
    );
  };

  const handleReset = () => {
    setDesks(toEditorDesks(initialDesks));
    setDeletedIds([]);
    setSelectedKey(null);
    setMsg(null);
  };

  const handleSave = async () => {
    const labels = desks.map((d) => d.label.trim());
    if (labels.some((l) => l.length === 0)) {
      setMsg({ type: 'error', text: 'ชื่อโต๊ะต้องไม่ว่าง' });
      return;
    }
    if (new Set(labels).size !== labels.length) {
      setMsg({ type: 'error', text: 'มีชื่อโต๊ะซ้ำกัน — เปลี่ยนชื่อก่อนบันทึก' });
      return;
    }

    setIsSaving(true);
    setMsg(null);
    try {
      const payload = buildPayload(
        desks.map((d) => ({ ...d, label: d.label.trim() })),
        deletedIds,
        initialDevices
      );
      const res = await onSave(payload);
      setMsg({ type: 'success', text: `บันทึกผังห้องแล้ว — ${res.summary}` });
    } catch (err: unknown) {
      setMsg({ type: 'error', text: errText(err, 'บันทึกไม่สำเร็จ') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmApply = async () => {
    if (sourceId === '') return;
    setApplyBusy(true);
    setApplyErr('');
    try {
      const res = await onApplyLayout(Number(sourceId), true);
      setShowApply(false);
      setSourceId('');
      setPreview(null);
      setMsg({
        type: 'success',
        text: `คัดลอกผังจากห้อง ${res.preview.sourceRoomName} แล้ว — ${res.summary ?? ''}`,
      });
    } catch (err: unknown) {
      setApplyErr(errText(err, 'คัดลอกผังไม่สำเร็จ'));
    } finally {
      setApplyBusy(false);
    }
  };

  const sourceOptions = (allRooms ?? []).filter((r) => r.id !== roomId);

  return (
    <div className="rle-root" onDragEnd={handleDragEnd}>
      {/* ── Header ── */}
      <div className="rle-hdr">
        <div className="rle-hdr-left">
          {onBack && (
            <button className="btn btn-ghost btn-sm" onClick={onBack}>
              <ArrowLeft size={15} /> ย้อนกลับ
            </button>
          )}
          <div>
            <h2 className="rle-title">
              จัดผังห้อง{' '}
              {allRooms && allRooms.length > 0 && onSelectRoom ? (
                <select
                  className="rle-room-select"
                  value={roomId}
                  onChange={(e) => onSelectRoom(Number(e.target.value))}
                >
                  {allRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      ห้อง {r.name} (ชั้น {r.floor.number})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="rle-room-name">{roomName}</span>
              )}
              {dirty && <span className="rle-dirty">มีการแก้ไขยังไม่ได้บันทึก</span>}
            </h2>
            <div className="rle-sub">
              ลากโต๊ะไปวางบนผัง ลากเครื่องเข้า/ออกจากโต๊ะ แล้วกดบันทึก
            </div>
          </div>
        </div>

        <div className="rle-actions">
          {msg && (
            <span
              className={`rle-msg ${msg.type === 'success' ? 'rle-msg-ok' : 'rle-msg-err'}`}
              role="status"
            >
              {msg.text}
            </span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowApply(true)}
            title="คัดลอกผังจากห้องอื่นมาทับห้องนี้"
          >
            <Copy size={15} /> คัดลอกผัง
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleReset} disabled={isSaving}>
            <RotateCcw size={15} /> รีเซ็ต
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={isSaving}>
            <Save size={15} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกผังห้อง'}
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="rle-stats">
        <span className="rle-stat">
          <CheckCircle2 size={14} /> โต๊ะทั้งหมด {desks.length} โต๊ะ
        </span>
        <span className="rle-stat">
          <Move size={14} /> วางบนผังแล้ว {placed.length}
        </span>
        <span className="rle-stat rle-stat-warn">
          <AlertTriangle size={14} /> ยังไม่ได้วาง {unplaced.length}
        </span>
        <span className="rle-stat">
          <Monitor size={14} /> เครื่องไม่มีโต๊ะ {pool.length}
        </span>
      </div>

      {/* ── Workspace ── */}
      <div className="rle-workspace">
        {/* Canvas */}
        <div className="rle-canvas-wrap">
          <div
            ref={canvasRef}
            className={`rle-canvas ${dragOverCanvas ? 'is-over' : ''}`}
            onDragOver={handleCanvasDragOver}
            onDragLeave={() => setDragOverCanvas(false)}
            onDrop={handleCanvasDrop}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedKey(null);
            }}
          >
            <div className="rle-front-tag">กระดาน / หน้าห้อง</div>

            {placed.map((desk) => {
              const isSelected = desk.key === selectedKey;
              const isTarget = desk.key === deskTargetKey;
              return (
                <div
                  key={desk.key}
                  className={`rle-desk ${isSelected ? 'is-selected' : ''} ${
                    desk.deviceIds.length === 0 ? 'is-empty' : ''
                  } ${isTarget ? 'is-target' : ''}`}
                  style={{ left: `${desk.x}%`, top: `${desk.y}%` }}
                  draggable
                  onDragStart={(e) => startDeskDrag(e, desk.key)}
                  onDragOver={(e) => handleDeskDragOver(e, desk.key)}
                  onDragLeave={() =>
                    setDeskTargetKey((k) => (k === desk.key ? null : k))
                  }
                  onDrop={(e) => handleDeskDrop(e, desk.key)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedKey(desk.key);
                  }}
                  title={desk.label}
                >
                  <div className="rle-desk-label">{desk.label}</div>
                  <div className="rle-desk-chips">
                    {desk.deviceIds.map((id) => {
                      const dev = deviceById.get(id);
                      if (!dev) return null;
                      return (
                        <span
                          key={id}
                          className="rle-desk-chip"
                          draggable
                          onDragStart={(e) => startDeviceDrag(e, id)}
                          onDragEnd={handleDragEnd}
                        >
                          {dev.name}
                        </span>
                      );
                    })}
                    {desk.deviceIds.length === 0 && <span className="rle-desk-empty">ว่าง</span>}
                  </div>
                </div>
              );
            })}

            {placed.length === 0 && (
              <div className="rle-canvas-empty">
                <Move size={34} />
                <div className="rle-canvas-empty-title">
                  {unplaced.length > 0
                    ? 'ยังไม่มีโต๊ะบนผัง'
                    : 'ยังไม่มีโต๊ะในห้องนี้'}
                </div>
                <div className="rle-canvas-empty-text">
                  {unplaced.length > 0
                    ? 'ลากโต๊ะจากแถบด้านข้างมาวางตรงนี้ หรือกด "เรียงอัตโนมัติ"'
                    : 'กด "+ เพิ่มโต๊ะ" เพื่อเริ่มจัดผัง'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className={`rle-palette ${dragOverPalette ? 'is-over' : ''}`}>
          <div
            onDragOver={handlePaletteDragOver}
            onDragLeave={() => setDragOverPalette(false)}
            onDrop={handlePaletteDrop}
            className="rle-palette-drop"
          >
            {/* ปุ่มเพิ่มโต๊ะ */}
            <button className="btn btn-ghost btn-sm btn-full" onClick={handleAddDesk}>
              <PlusCircle size={15} /> เพิ่มโต๊ะ
            </button>

            {/* โต๊ะยังไม่ได้วาง */}
            <div className="rle-sec">
              <div className="rle-sec-hd">
                <span className="rle-sec-title">โต๊ะที่ยังไม่ได้วาง</span>
                <span className="rle-sec-count">{unplaced.length}</span>
              </div>
              {unplaced.length > 0 && (
                <button
                  className="btn btn-ghost btn-sm btn-full rle-autobtn"
                  onClick={handleAutoArrange}
                >
                  <Wand2 size={15} /> เรียงอัตโนมัติ ({unplaced.length})
                </button>
              )}
              <div className="rle-list">
                {unplaced.map((desk) => (
                  <div
                    key={desk.key}
                    className={`rle-palette-desk ${desk.key === selectedKey ? 'is-selected' : ''}`}
                    draggable
                    onDragStart={(e) => startDeskDrag(e, desk.key)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedKey(desk.key)}
                  >
                    <span className="rle-palette-desk-name">{desk.label}</span>
                    <span className="rle-palette-desk-meta">
                      {desk.deviceIds.length > 0
                        ? `${desk.deviceIds.length} เครื่อง`
                        : 'ว่าง'}
                    </span>
                  </div>
                ))}
                {unplaced.length === 0 && (
                  <div className="rle-hint">โต๊ะทุกตัวถูกวางบนผังแล้ว</div>
                )}
              </div>
            </div>

            {/* เครื่องยังไม่มีโต๊ะ */}
            <div className="rle-sec">
              <div className="rle-sec-hd">
                <span className="rle-sec-title">เครื่องที่ยังไม่มีโต๊ะ</span>
                <span className="rle-sec-count">{pool.length}</span>
              </div>
              <div className="rle-list">
                {pool.map((dev) => (
                  <div
                    key={dev.id}
                    className="rle-pool-item"
                    draggable
                    onDragStart={(e) => startDeviceDrag(e, dev.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <Monitor size={13} />
                    <span>{dev.name}</span>
                  </div>
                ))}
                {pool.length === 0 && (
                  <div className="rle-hint">เครื่องทุกตัวผูกกับโต๊ะแล้ว</div>
                )}
              </div>
            </div>

            {/* Inspector */}
            {selected && (
              <div className="rle-sec rle-inspector">
                <div className="rle-sec-hd">
                  <span className="rle-sec-title">โต๊ะที่เลือก</span>
                </div>
                <label className="form-label" htmlFor="rle-label-input">
                  ชื่อโต๊ะ
                </label>
                <input
                  id="rle-label-input"
                  className="form-input"
                  value={selected.label}
                  maxLength={60}
                  onChange={(e) => handleLabelChange(selected.key, e.target.value)}
                />
                <div className="rle-coord">
                  {selected.x !== null && selected.y !== null
                    ? `พิกัด: ${selected.x}%, ${selected.y}%`
                    : 'ยังไม่ได้วางบนผัง'}
                </div>

                <div className="rle-sec-hd rle-sec-hd-sub">
                  <span className="rle-sec-title">เครื่องบนโต๊ะนี้</span>
                  <span className="rle-sec-count">{selected.deviceIds.length}</span>
                </div>
                <div className="rle-list">
                  {selected.deviceIds.map((id) => {
                    const dev = deviceById.get(id);
                    if (!dev) return null;
                    return (
                      <div key={id} className="rle-insp-device">
                        <Monitor size={13} />
                        <span>{dev.name}</span>
                        <button
                          className="rle-chip-remove"
                          title="ดึงออกจากโต๊ะ"
                          onClick={() => handleUnassignDevice(id)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                  {selected.deviceIds.length === 0 && (
                    <div className="rle-hint">ลากเครื่องจากแถบด้านบนมาวางบนโต๊ะ</div>
                  )}
                </div>

                <button
                  className="btn btn-danger-outline btn-sm btn-full"
                  onClick={() => handleDeleteDesk(selected)}
                >
                  <Trash2 size={14} /> ลบโต๊ะนี้
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Apply layout modal ── */}
      {showApply && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !applyBusy) setShowApply(false);
          }}
        >
          <div className="modal">
            <div className="modal-drag-handle" />
            <div className="modal-header">
              <div className="modal-title">คัดลอกผังจากห้องอื่น</div>
              <button
                className="modal-close"
                onClick={() => setShowApply(false)}
                disabled={applyBusy}
                aria-label="ปิด"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {applyErr && <div className="alert alert-error">{applyErr}</div>}

              <div className="form-group">
                <label className="form-label" htmlFor="rle-source-select">
                  ห้องต้นทาง
                </label>
                <select
                  id="rle-source-select"
                  className="form-select"
                  value={sourceId}
                  onChange={(e) =>
                    setSourceId(e.target.value === '' ? '' : Number(e.target.value))
                  }
                >
                  <option value="">— เลือกห้อง —</option>
                  {sourceOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      ห้อง {r.name} (ชั้น {r.floor.number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rle-warn">
                <AlertTriangle size={16} />
                <span>
                  การคัดลอกจะ<strong> แทนผังปัจจุบันของห้อง {roomName} ทั้งหมด</strong>
                  {' '}(โต๊ะเดิม {preview?.existingDesks ?? '…'} โต๊ะ) และจับคู่เครื่องให้อัตโนมัติ
                  — ขึ้นบันทึกในประวัติการแก้ไขทุกครั้ง
                </span>
              </div>

              {sourceId !== '' && previewLoading && (
                <div className="loading-center">
                  <div className="spinner" />
                  <span>กำลังคำนวณตัวอย่าง...</span>
                </div>
              )}

              {preview && (
                <table className="rle-preview">
                  <tbody>
                    <tr>
                      <td>ห้องต้นทาง</td>
                      <td>
                        <strong>{preview.sourceRoomName}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>โต๊ะที่จะสร้าง (จากต้นทางที่มีเครื่อง)</td>
                      <td>
                        <strong>{preview.desksToCreate}</strong> / {preview.sourceDeskCount} โต๊ะ
                      </td>
                    </tr>
                    <tr>
                      <td>จับคู่ชื่อเครื่องตรงกัน</td>
                      <td>{preview.matchedByName} เครื่อง</td>
                    </tr>
                    <tr>
                      <td>จับคู่ตามลำดับชื่อที่เหลือ</td>
                      <td>{preview.assignedByOrder} เครื่อง</td>
                    </tr>
                    <tr>
                      <td>เครื่องที่จะยังไม่มีโต๊ะ</td>
                      <td className={preview.toPool > 0 ? 'rle-preview-warn' : ''}>
                        {preview.toPool} เครื่อง / ทั้งหมด {preview.totalDevices}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {sourceId !== '' && !previewLoading && !preview && !applyErr && (
                <div className="rle-hint">ไม่สามารถคำนวณตัวอย่างได้</div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowApply(false)}
                disabled={applyBusy}
              >
                ยกเลิก
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmApply}
                disabled={!preview || applyBusy}
              >
                {applyBusy
                  ? 'กำลังคัดลอก...'
                  : preview
                  ? `ยืนยันคัดลอก (${preview.desksToCreate} โต๊ะ)`
                  : 'ยืนยันคัดลอก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
