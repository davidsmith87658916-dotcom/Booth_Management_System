import React, { useState, useEffect, useMemo } from 'react';
import {
  Grid, Zap, RefreshCw, Plus, CheckCircle2,
  Lock, Unlock, RotateCcw, Layers, List,
  Store, Crown, Sparkles, Footprints,
  ZoomIn, ZoomOut, Share2, Clock
} from 'lucide-react';
import ModalFrame from './ModalFrame';
import { useLanguage } from '../i18n';

export default function FloorPlan({
  booths = [],
  categories = [],
  layout,
  user,
  onSaveLayout,
  onCreateBooth,
  onSelectBooth,
  selectedBooth,
  searchQuery = '',
  onDirtyChange,
  onOpenPublicModal,
  onClearExpiredHolds
}) {
  const { lang, t } = useLanguage();

  const labels = useMemo(() => ({
    available: t('status_available', 'Available'),
    hold: t('status_hold', 'On hold'),
    sold: t('status_sold', 'Sold'),
    blocked: t('status_blocked', 'Blocked')
  }), [t]);

  // Edit Mode & Grid Matrix State (matching ICT Lab SeatingPlan)
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'vip', 'corner', 'standard'
  const [viewMode, setViewMode] = useState('2d'); // '2d', 'list'
  const [creating, setCreating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [hoveredBooth, setHoveredBooth] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin' && isEditMode) {
      setIsEditMode(false);
    }
  }, [user?.role, isEditMode]);

  // Count expired holds
  const expiredHoldCount = useMemo(() => {
    return booths.filter(b => {
      if (b.status !== 'hold' || !b.active_booking?.hold_expires_at) return false;
      try {
        const expiry = new Date(b.active_booking.hold_expires_at.replace(' ', 'T') + 'Z').getTime();
        return expiry < currentTime;
      } catch {
        return false;
      }
    }).length;
  }, [booths, currentTime]);

  // Drag and drop state
  const [draggedBoothCode, setDraggedBoothCode] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Helper to generate a clean 4 rows x 11 columns exhibition grid (A-01..A-10 with center aisle)
  const generateDefaultGrid = useMemo(() => {
    return () => {
      const rows = ['A', 'B', 'C', 'D'];
      const grid = [];
      for (let r = 0; r < rows.length; r++) {
        const rowLetter = rows[r];
        const row = [];
        // Left block (booths 1 to 5)
        for (let c = 1; c <= 5; c++) {
          row.push(`${rowLetter}-${String(c).padStart(2, '0')}`);
        }
        // Center Walkway / Aisle (null)
        row.push(null);
        // Right block (booths 6 to 10)
        for (let c = 6; c <= 10; c++) {
          row.push(`${rowLetter}-${String(c).padStart(2, '0')}`);
        }
        grid.push(row);
      }
      return grid;
    };
  }, []);

  // Grid Layout Matrix State
  const [gridLayout, setGridLayout] = useState(() => {
    if (layout?.grid_layout && Array.isArray(layout.grid_layout) && layout.grid_layout.length > 0) {
      return layout.grid_layout;
    }
    return generateDefaultGrid();
  });

  const [builderRows, setBuilderRows] = useState(() => gridLayout.length);
  const [builderCols, setBuilderCols] = useState(() => gridLayout[0]?.length || 11);

  // Auto dismiss feedback banner
  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => setFeedbackMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty && layout?.grid_layout && Array.isArray(layout.grid_layout) && layout.grid_layout.length > 0) {
      setGridLayout(layout.grid_layout);
      setBuilderRows(layout.grid_layout.length);
      setBuilderCols(layout.grid_layout[0]?.length || 11);
    }
  }, [layout, dirty]);

  // Adjust Grid Matrix Size (Rows x Columns)
  const handleUpdateGridSize = (newRows, newCols) => {
    const rCount = Math.max(1, Math.min(20, newRows));
    const cCount = Math.max(1, Math.min(20, newCols));
    let grid = [...gridLayout];

    if (rCount > grid.length) {
      for (let i = grid.length; i < rCount; i++) {
        grid.push(Array(cCount).fill(null));
      }
    } else if (rCount < grid.length) {
      grid = grid.slice(0, rCount);
    }

    grid = grid.map(row => {
      let newRow = [...row];
      if (cCount > newRow.length) {
        newRow = newRow.concat(Array(cCount - newRow.length).fill(null));
      } else if (cCount < newRow.length) {
        newRow = newRow.slice(0, cCount);
      }
      return newRow;
    });

    setGridLayout(grid);
    setBuilderRows(rCount);
    setBuilderCols(cCount);
    setDirty(true);
  };

  // Cell Click in Edit Mode: Add or Remove booth in cell (matching ICT Lab)
  const handleCellClickInEditMode = (rIdx, cIdx) => {
    if (isLocked) {
      setFeedbackMessage({
        type: 'info',
        text: lang === 'kh'
          ? 'កូដ និងទីតាំងស្តង់ត្រូវបានចាក់សោជាប់។ សូមចុច "ដោះសោកូដស្តង់" ប្រសិនបើអ្នកចង់បន្ថែម ឬលុបស្តង់លើប្លង់!'
          : 'Booth codes are locked. Click "Unlock Codes" to add or remove booths on the grid!'
      });
      return;
    }

    const newGrid = gridLayout.map(row => [...row]);
    const currentCell = newGrid[rIdx][cIdx];

    if (currentCell === null) {
      // Find unassigned booth first
      const allAssigned = new Set(newGrid.flat().filter(Boolean));
      const unassigned = booths.find(b => !allAssigned.has(b.booth_code));
      if (unassigned) {
        newGrid[rIdx][cIdx] = unassigned.booth_code;
      } else {
        const rowLetter = String.fromCharCode(65 + Math.min(25, rIdx));
        let nextNum = 1;
        while (allAssigned.has(`${rowLetter}-${String(nextNum).padStart(2, '0')}`)) {
          nextNum++;
        }
        newGrid[rIdx][cIdx] = `${rowLetter}-${String(nextNum).padStart(2, '0')}`;
      }
    } else {
      // Remove booth from grid cell
      newGrid[rIdx][cIdx] = null;
    }

    setGridLayout(newGrid);
    setDirty(true);
  };

  // Drag and Drop Booths
  const handleDragStart = (e, boothCode) => {
    setDraggedBoothCode(boothCode);
    e.dataTransfer.setData('text/plain', boothCode);
  };

  const handleDragOver = (e, cellKey) => {
    e.preventDefault();
    if (dragOverCell !== cellKey) setDragOverCell(cellKey);
  };

  const handleDrop = (e, targetR, targetC) => {
    e.preventDefault();
    setDragOverCell(null);
    if (!draggedBoothCode) return;

    const sourceCode = draggedBoothCode;
    setDraggedBoothCode(null);

    const newGrid = gridLayout.map(row => [...row]);
    let sourceR = -1;
    let sourceC = -1;

    for (let r = 0; r < newGrid.length; r++) {
      for (let c = 0; c < newGrid[r].length; c++) {
        if (newGrid[r][c] === sourceCode) {
          sourceR = r;
          sourceC = c;
          break;
        }
      }
      if (sourceR !== -1) break;
    }

    if (sourceR === -1) {
      // Dragged from unassigned tray onto grid
      newGrid[targetR][targetC] = sourceCode;
    } else {
      // Swap cell positions
      const targetContent = newGrid[targetR][targetC];
      newGrid[targetR][targetC] = sourceCode;
      newGrid[sourceR][sourceC] = targetContent;
    }

    setGridLayout(newGrid);
    setDirty(true);
    setFeedbackMessage({
      type: 'success',
      text: lang === 'kh'
        ? `បានផ្លាស់ប្តូរទីតាំងស្តង់ ${sourceCode} ដោយជោគជ័យ!`
        : `Successfully moved booth ${sourceCode}!`
    });
  };

  // Reset layout to default 4x11 template
  const handleResetLayoutToDefault = () => {
    if (confirm(lang === 'kh' ? 'តើអ្នកពិតជាចង់ Reset ប្លង់ស្តង់ទៅទម្រង់ស្តង់ដារ (A-01 ដល់ D-10) វិញមែនទេ?' : 'Reset grid layout to standard exhibition layout?')) {
      const defaultGrid = generateDefaultGrid();
      setGridLayout(defaultGrid);
      setBuilderRows(defaultGrid.length);
      setBuilderCols(defaultGrid[0].length);
      setDirty(true);
    }
  };

  // Auto assign all booths into matrix grid
  const handleAutoAssign = () => {
    const defaultGrid = generateDefaultGrid();
    setGridLayout(defaultGrid);
    setBuilderRows(defaultGrid.length);
    setBuilderCols(defaultGrid[0].length);
    setDirty(true);
    setFeedbackMessage({
      type: 'success',
      text: lang === 'kh' ? 'បានរៀបចំស្តង់ទាំងអស់ចូលក្នុងក្រឡាស្វ័យប្រវត្តិ!' : 'Auto-arranged booths onto the grid!'
    });
  };

  // Save layout to server
  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      const cellW = 80;
      const cellH = 80;
      const startX = 60;
      const startY = 60;

      const placements = [];
      const placedCodes = new Set();

      gridLayout.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            const booth = booths.find(b => b.booth_code === cell);
            if (booth && !placedCodes.has(booth.id)) {
              placedCodes.add(booth.id);
              placements.push({
                id: booth.id,
                x: startX + c * cellW,
                y: startY + r * cellH,
                w: 60,
                h: 60
              });
            }
          }
        });
      });

      // Include unplaced booths with x: null, y: null
      booths.forEach(b => {
        if (!placedCodes.has(b.id)) {
          placements.push({ id: b.id, x: null, y: null, w: 60, h: 60 });
        }
      });

      const payload = {
        revision: layout?.revision || 0,
        width: Math.max(1200, (builderCols + 2) * cellW + 120),
        height: Math.max(800, (builderRows + 2) * cellH + 120),
        placements,
        elements: layout?.elements || [],
        grid_layout: gridLayout
      };

      await onSaveLayout(payload);
      setDirty(false);
      setIsEditMode(false);
      setFeedbackMessage({
        type: 'success',
        text: lang === 'kh' ? 'បានរក្សាទុកប្លង់ថ្មីដោយជោគជ័យ!' : 'Layout saved successfully!'
      });
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate placed and unplaced booths
  const gridCellsFlat = gridLayout.flat().filter(Boolean);
  const unassignedBooths = booths.filter(b => !gridCellsFlat.includes(b.booth_code));

  const counts = {
    available: booths.filter(b => b.status === 'available').length,
    hold: booths.filter(b => b.status === 'hold').length,
    sold: booths.filter(b => b.status === 'sold').length,
    blocked: booths.filter(b => b.status === 'blocked').length
  };

  // Category counts
  const catCounts = {
    vip: booths.filter(b => (b.category?.name || b.category_name || '').includes('VIP') || b.price >= 2000).length,
    corner: booths.filter(b => ((b.category?.name || b.category_name || '').includes('Corner') || (b.price >= 1000 && b.price < 2000))).length,
    standard: booths.filter(b => !((b.category?.name || b.category_name || '').includes('VIP') || (b.category?.name || b.category_name || '').includes('Corner') || b.price >= 1000)).length
  };

  // Helper to determine booth category type
  const getBoothCategoryType = (booth) => {
    if (!booth) return 'standard';
    const name = booth.category?.name || booth.category_name || '';
    if (name.includes('VIP') || (booth.price && booth.price >= 2000)) return 'vip';
    if (name.includes('Corner') || (booth.price && booth.price >= 1000)) return 'corner';
    return 'standard';
  };

  // Render Booth Card with distinct shapes, badges, and luxury styling for each category
  const renderBoothCard = (cellCode) => {
    const booth = booths.find(b => b.booth_code === cellCode);
    const isSelected = selectedBooth?.id === booth?.id;
    const catType = getBoothCategoryType(booth);
    const isVIP = catType === 'vip';
    const isCorner = catType === 'corner';

    // Status filtering
    const matchesFilter = statusFilter === 'all' || (booth && booth.status === statusFilter);

    // Category filtering
    const matchesCat = categoryFilter === 'all' || (categoryFilter === catType);

    // Search query matching
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || (booth && (
      booth.booth_code?.toLowerCase().includes(q) ||
      booth.active_booking?.exhibitor_name?.toLowerCase().includes(q) ||
      (booth.category?.name || booth.category_name || '')?.toLowerCase().includes(q)
    ));

    const isDimmed = !matchesFilter || !matchesCat || !matchesSearch;

    // Status Dots
    let statusDot = null;
    if (booth) {
      if (booth.status === 'available') {
        statusDot = <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" title="នៅទំនេរ (Available)" />;
      } else if (booth.status === 'sold') {
        statusDot = <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-200" title="បានលក់ដាច់ (Sold)" />;
      } else if (booth.status === 'hold') {
        statusDot = <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200" title="កំពុងកក់ទុក (Hold)" />;
      } else if (booth.status === 'blocked') {
        statusDot = <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200" title="បិទដំណើរការ (Blocked)" />;
      }
    }

    // Dynamic Category Container Styling
    let cardWrapperClass = '';
    let headerClass = '';

    if (isVIP) {
      // VIP Island Suite Styling: Royal Purple
      cardWrapperClass = 'border-2 border-purple-400 bg-purple-50/40 hover:border-purple-500 shadow-2xs';
      headerClass = 'bg-gradient-to-r from-purple-700 to-indigo-800 text-white';
    } else if (isCorner) {
      // Premium Corner Booth Styling: Sky Blue
      cardWrapperClass = 'border-2 border-sky-400 bg-sky-50/40 hover:border-sky-500 shadow-2xs';
      headerClass = 'bg-gradient-to-r from-sky-600 to-blue-700 text-white';
    } else {
      // Standard Shell Scheme
      cardWrapperClass = 'border border-slate-200 bg-white hover:border-slate-300 shadow-2xs';
      headerClass = 'bg-slate-50 text-slate-800 border-b border-slate-100';
    }

    // Selected Ring Effect (pure ring & border, no scale transform)
    const selectedClass = isSelected
      ? isVIP
        ? 'ring-2 ring-purple-600 ring-offset-2 border-purple-600 shadow-md z-10'
        : isCorner
          ? 'ring-2 ring-sky-600 ring-offset-2 border-sky-600 shadow-md z-10'
          : 'ring-2 ring-blue-600 ring-offset-2 border-blue-600 shadow-md z-10'
      : '';

    return (
      <div
        role="button"
        tabIndex={0}
        draggable={isEditMode}
        onDragStart={(e) => handleDragStart(e, cellCode)}
        onClick={() => {
          if (booth) onSelectBooth(booth);
        }}
        onMouseEnter={() => booth && setHoveredBooth(booth)}
        onMouseLeave={() => setHoveredBooth(null)}
        className={`flex flex-col h-full min-h-[80px] sm:min-h-[86px] rounded-xl overflow-hidden cursor-pointer transition-all duration-150 relative select-none hover:-translate-y-0.5 ${
          cardWrapperClass
        } ${selectedClass} ${
          isEditMode ? 'cursor-grab active:cursor-grabbing' : 'active:translate-y-0'
        } ${
          isDimmed ? 'opacity-25 grayscale-[60%]' : ''
        }`}
      >
        {/* Card Header: Code + Category Icon + Status Dot */}
        <div className={`px-2 py-1 flex items-center justify-between ${headerClass}`}>
          <div className="flex items-center gap-1 pointer-events-none shrink-0">
            {isVIP ? (
              <Crown size={12} className="text-amber-300 fill-amber-300 shrink-0" />
            ) : isCorner ? (
              <Sparkles size={12} className="text-sky-200 shrink-0" />
            ) : (
              <Store size={12} className="text-emerald-600 shrink-0" />
            )}
            <span className={`text-[11px] font-black tracking-tight whitespace-nowrap shrink-0 ${isVIP || isCorner ? 'text-white' : 'text-slate-800'}`}>
              {cellCode}
            </span>
            {isVIP && (
              <span className="bg-amber-400 text-purple-950 font-black text-[7px] px-1 py-0.2 rounded font-mono shrink-0">
                VIP
              </span>
            )}
            {isEditMode && isLocked && (
              <Lock size={10} className={isVIP || isCorner ? 'text-white/70 ml-0.5 shrink-0' : 'text-slate-400 ml-0.5 shrink-0'} title="កូដត្រូវបានចាក់សោ" />
            )}
          </div>
          <div className="shrink-0 ml-1">
            {statusDot}
          </div>
        </div>

        {/* Card Body: Minimal, Clean, Uncluttered */}
        <div className="px-2 py-1.5 flex-1 flex flex-col justify-between items-center text-center">
          {booth ? (
            <>
              {/* Exhibitor Name or "Available" */}
              <div className="w-full flex-1 flex items-center justify-center my-0.5">
                <span className={`font-semibold text-xs leading-tight line-clamp-1 break-all ${
                  isVIP ? 'text-purple-950 font-bold' : 'text-slate-800'
                }`}>
                  {booth.active_booking?.exhibitor_name || (
                    <span className="text-emerald-700 font-medium">{lang === 'kh' ? 'នៅទំនេរ' : 'Available'}</span>
                  )}
                </span>
              </div>

              {/* Price */}
              <div className="w-full flex items-center justify-center pt-1 border-t border-black/5">
                <span className={`font-mono font-bold text-xs ${
                  isVIP ? 'text-purple-700' : isCorner ? 'text-sky-700' : 'text-slate-600'
                }`}>
                  ${booth.price?.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <span className="text-[11px] font-medium italic">{lang === 'kh' ? 'មិនទាន់បង្កើត' : 'Unregistered'}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full space-y-5">

      {/* 1. Header Banner - Clean & Modern Ribbon (matching ICT Lab) */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-4 sm:p-5 text-white shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-xs rounded-xl shadow-2xs">
            <Grid size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">
              {lang === 'kh' ? 'ប្លង់សាលពិព័រណ៍ (Expo Floor Matrix)' : 'Exhibition Floor Plan'}
            </h1>
            <p className="text-xs text-blue-100/80 font-medium">
              {lang === 'kh' ? 'រៀបចំប្លង់ស្តង់ គ្រប់គ្រងការលក់ និងបែងចែកទីតាំងយ៉ាងរហ័ស' : 'Arrange booths, manage reservations, and organize hall zones'}
            </p>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer"
            >
              <Plus size={15} />
              <span>{lang === 'kh' ? 'បង្កើតស្តង់ថ្មី' : '+ Add Booth'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Stats Section - 4 Quick Stats Cards (matching ICT Lab) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Available */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
          className={`rounded-2xl border p-4 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
            statusFilter === 'available'
              ? 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-300'
              : 'bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200/70'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{labels.available}</span>
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <strong className="text-2xl font-bold text-emerald-700">{counts.available}</strong>
            <span className="text-xs font-semibold text-emerald-700/80 bg-emerald-100/60 px-2 py-0.5 rounded-md">
              {lang === 'kh' ? 'ស្តង់' : 'Booths'}
            </span>
          </div>
        </div>

        {/* On Hold */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter(statusFilter === 'hold' ? 'all' : 'hold')}
          className={`rounded-2xl border p-4 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
            statusFilter === 'hold'
              ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-300'
              : 'bg-amber-50/70 hover:bg-amber-50 border-amber-200/70'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{labels.hold}</span>
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <strong className="text-2xl font-bold text-amber-700">{counts.hold}</strong>
            <span className="text-xs font-semibold text-amber-700/80 bg-amber-100/60 px-2 py-0.5 rounded-md">
              {lang === 'kh' ? 'ស្តង់' : 'Booths'}
            </span>
          </div>
        </div>

        {/* Sold */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter(statusFilter === 'sold' ? 'all' : 'sold')}
          className={`rounded-2xl border p-4 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
            statusFilter === 'sold'
              ? 'bg-blue-100/90 border-blue-400 ring-2 ring-blue-300'
              : 'bg-blue-50/70 hover:bg-blue-50 border-blue-200/70'
          }`}
        >
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>{labels.sold}</span>
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <strong className="text-2xl font-bold text-blue-700">{counts.sold}</strong>
            <span className="text-xs font-semibold text-blue-700/80 bg-blue-100/60 px-2 py-0.5 rounded-md">
              {lang === 'kh' ? 'ស្តង់' : 'Booths'}
            </span>
          </div>
        </div>

        {/* Total Booths */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            {lang === 'kh' ? 'ស្តង់សរុបទាំងអស់' : 'Total Booths'}
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <strong className="text-2xl font-bold text-slate-800">{booths.length}</strong>
            <span className="text-xs font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-md">
              {lang === 'kh' ? 'ស្តង់' : 'Booths'}
            </span>
          </div>
        </div>
      </section>

      {/* 2.5 Category Legend & Quick Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {lang === 'kh' ? 'ប្រភេទស្តង់៖' : 'Booth Categories:'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Show All */}
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              categoryFilter === 'all'
                ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>{lang === 'kh' ? 'ទាំងអស់' : 'All Types'}</span>
          </button>

          {/* VIP Island Suite Filter */}
          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === 'vip' ? 'all' : 'vip')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              categoryFilter === 'vip'
                ? 'bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-300'
                : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
            }`}
          >
            <Crown size={14} className={categoryFilter === 'vip' ? 'text-amber-300' : 'text-purple-600'} />
            <span>{lang === 'kh' ? 'ស្តង់កោះ VIP' : 'VIP Island Suite'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-purple-200/60 text-purple-900 font-bold">
              ${(2500).toLocaleString()} • {catCounts.vip}
            </span>
          </button>

          {/* Premium Corner Booth Filter */}
          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === 'corner' ? 'all' : 'corner')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              categoryFilter === 'corner'
                ? 'bg-sky-600 text-white border-sky-700 shadow-md ring-2 ring-sky-300'
                : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
            }`}
          >
            <Sparkles size={13} className={categoryFilter === 'corner' ? 'text-sky-200' : 'text-sky-600'} />
            <span>{lang === 'kh' ? 'ស្តង់កែង Corner' : 'Premium Corner'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-sky-200/60 text-sky-900 font-bold">
              ${(1200).toLocaleString()} • {catCounts.corner}
            </span>
          </button>

          {/* Standard Shell Scheme Filter */}
          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === 'standard' ? 'all' : 'standard')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              categoryFilter === 'standard'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Store size={13} className={categoryFilter === 'standard' ? 'text-emerald-200' : 'text-emerald-600'} />
            <span>{lang === 'kh' ? 'ស្តង់ស្ដង់ដារ Shell' : 'Standard Shell'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-emerald-200/60 text-emerald-900 font-bold">
              ${(650).toLocaleString()} • {catCounts.standard}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Control & Action Bar (matching ICT Lab) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">

          {/* Left View Switchers */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Layers size={14} />
              <span>2D Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <List size={14} />
              <span>{lang === 'kh' ? 'បញ្ជីតារាង' : 'List View'}</span>
            </button>

            {(statusFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
                className="text-[11px] text-blue-600 font-bold ml-2 hover:underline cursor-pointer"
              >
                {lang === 'kh' ? 'បង្ហាញទាំងអស់' : 'Show All'}
              </button>
            )}

            {/* Zoom Controls */}
            {viewMode === '2d' && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold gap-0.5 ml-2">
                <button
                  type="button"
                  onClick={() => setZoomScale(s => Math.max(0.6, +(s - 0.15).toFixed(2)))}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-700 cursor-pointer"
                  title={t('zoomOut', 'Zoom Out')}
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[10px] font-mono px-1 text-slate-600">{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale(s => Math.min(1.8, +(s + 0.15).toFixed(2)))}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-700 cursor-pointer"
                  title={t('zoomIn', 'Zoom In')}
                >
                  <ZoomIn size={13} />
                </button>
                {zoomScale !== 1 && (
                  <button
                    type="button"
                    onClick={() => setZoomScale(1)}
                    className="px-1.5 py-0.5 text-[9px] rounded bg-white text-blue-600 font-bold cursor-pointer"
                    title={t('resetZoom', 'Reset Zoom')}
                  >
                    100%
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isEditMode ? (
              <>
                {/* Public View Link */}
                {onOpenPublicModal && (
                  <button
                    type="button"
                    onClick={onOpenPublicModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 px-3 py-2 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title={lang === 'kh' ? 'តំណភ្ជាប់ប្លង់សាធារណៈសម្រាប់ភ្ញៀវ' : 'Public Live Plan'}
                  >
                    <Share2 size={14} />
                    <span>{lang === 'kh' ? 'ប្លង់សាធារណៈ' : 'Public Link'}</span>
                  </button>
                )}

                {/* Clear Expired Holds (Admin or Manager) */}
                {expiredHoldCount > 0 && (user?.role === 'admin' || user?.role === 'manager') && onClearExpiredHolds && (
                  <button
                    type="button"
                    onClick={onClearExpiredHolds}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-2 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer animate-pulse"
                    title={lang === 'kh' ? 'រំលាយស្តង់ដែលផុតកំណត់ Hold' : 'Release expired holds'}
                  >
                    <Clock size={13} />
                    <span>{expiredHoldCount} {lang === 'kh' ? 'ស្តង់ផុតម៉ោង' : 'expired'}</span>
                  </button>
                )}

                {/* Auto Arrange (Admin only) */}
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={handleAutoAssign}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200/80 px-3.5 py-2 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Zap size={14} />
                    <span>{lang === 'kh' ? 'រៀបចំស្វ័យប្រវត្តិ' : 'Auto Arrange'}</span>
                  </button>
                )}

                {user?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    <Grid size={14} />
                    <span>{lang === 'kh' ? 'កែប្លង់សាល' : 'Edit Layout'}</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Rows & Cols Matrix Inputs */}
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-900">
                  <span>{lang === 'kh' ? 'ជួរដេក៖' : 'Rows:'}</span>
                  <input
                    type="number"
                    className="w-12 px-1.5 py-0.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-center"
                    value={builderRows}
                    min={1}
                    max={20}
                    onChange={(e) => handleUpdateGridSize(parseInt(e.target.value, 10) || 1, builderCols)}
                  />
                  <span className="ml-1">{lang === 'kh' ? 'ជួរឈរ៖' : 'Cols:'}</span>
                  <input
                    type="number"
                    className="w-12 px-1.5 py-0.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-center"
                    value={builderCols}
                    min={1}
                    max={20}
                    onChange={(e) => handleUpdateGridSize(builderRows, parseInt(e.target.value, 10) || 1)}
                  />
                </div>

                {/* Lock Booth Codes Toggle */}
                <button
                  type="button"
                  onClick={() => setIsLocked(!isLocked)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer border ${
                    isLocked
                      ? 'bg-blue-600 text-white border-blue-700 shadow-blue-500/20 hover:bg-blue-700'
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                  title={isLocked ? 'កូដត្រូវបានចាក់សោជាប់ (អូសតែស្តង់)' : 'កូដមិនទាន់ចាក់សោ (អាចបន្ថែម ឬលុបស្តង់បាន)'}
                >
                  {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                  <span>{isLocked ? (lang === 'kh' ? 'ចាក់សោកូដស្តង់' : 'Lock Codes') : (lang === 'kh' ? 'ដោះសោកូដស្តង់' : 'Unlock Codes')}</span>
                </button>

                {/* Reset Layout */}
                <button
                  type="button"
                  onClick={handleResetLayoutToDefault}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Reset ប្លង់ទៅលំនាំដើម"
                >
                  <RotateCcw size={14} />
                  <span>{lang === 'kh' ? 'Reset ប្លង់' : 'Reset'}</span>
                </button>

                {/* Cancel Edit Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    if (layout?.grid_layout && Array.isArray(layout.grid_layout) && layout.grid_layout.length > 0) {
                      setGridLayout(layout.grid_layout);
                    } else {
                      setGridLayout(generateDefaultGrid());
                    }
                    setDirty(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3.5 py-2 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  {lang === 'kh' ? 'បោះបង់' : 'Cancel'}
                </button>

                {/* Save Layout Button */}
                <button
                  type="button"
                  onClick={handleSaveLayout}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 size={15} />
                  <span>{isSaving ? (lang === 'kh' ? 'កំពុងរក្សាទុក…' : 'Saving…') : (lang === 'kh' ? 'រក្សាទុកប្លង់ថ្មី' : 'Save Layout')}</span>
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in slide-in-from-top-2 ${
          feedbackMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          feedbackMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' :
          'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className={feedbackMessage.type === 'error' ? 'text-rose-600' : 'text-emerald-600'} />
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Unassigned / Unplaced Booths Section */}
      {unassignedBooths.length > 0 && (
        <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {lang === 'kh'
                  ? `ស្តង់មិនទាន់បានដាក់លើប្លង់ (${unassignedBooths.length} ស្តង់)`
                  : `Unplaced Booths (${unassignedBooths.length})`}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAutoAssign}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-blue-200 px-3 py-1 rounded-xl shadow-2xs cursor-pointer"
            >
              {lang === 'kh' ? 'ដាក់លើប្លង់ទាំងអស់' : 'Place All on Grid'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5 max-h-36 overflow-y-auto p-1">
            {unassignedBooths.map(b => {
              const bCat = getBoothCategoryType(b);
              return (
                <div
                  key={b.id}
                  draggable={isEditMode}
                  onDragStart={(e) => handleDragStart(e, b.booth_code)}
                  className={`border text-slate-800 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2 text-xs font-medium transition-all select-none cursor-grab ${
                    bCat === 'vip'
                      ? 'bg-purple-50 border-purple-300 hover:bg-purple-100'
                      : bCat === 'corner'
                        ? 'bg-sky-50 border-sky-300 hover:bg-sky-100'
                        : 'bg-white hover:bg-blue-50 border-slate-200'
                  }`}
                >
                  {bCat === 'vip' ? (
                    <Crown size={14} className="text-amber-500" />
                  ) : bCat === 'corner' ? (
                    <Sparkles size={14} className="text-sky-600" />
                  ) : (
                    <Store size={14} className="text-blue-600" />
                  )}
                  <span className="font-bold">{b.booth_code}</span>
                  <span className="text-[10px] text-slate-400">({b.category?.name || b.category_name || 'Standard'})</span>
                  <span className="text-[11px] font-bold text-blue-600">${b.price}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. The Blueprint Matrix Floor Board with Generous Spacing & Walking Aisles */}
      {viewMode === '2d' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6">

            {/* Edit Mode Notification */}
            {isEditMode && (
              <div className="mb-4 w-full bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
                <RefreshCw size={15} className="text-blue-600 animate-spin" />
                <span>
                  {lang === 'kh'
                    ? 'ទម្រង់កែប្លង់សាល៖ ចុចលើក្រឡាទទេដើម្បីដាក់ស្តង់ ឬអូសកាតស្តង់ដើម្បីផ្លាស់ប្តូរទីតាំង'
                    : 'Edit Mode: Click empty cells to place booths, or drag cards to re-arrange.'}
                </span>
              </div>
            )}

            {/* Clean Blueprint Grid Container with Generous Spacing */}
            <div className="desks-grid flex flex-col items-center justify-center p-6 sm:p-10 w-full overflow-x-auto">
              
              <div
                className="w-full flex flex-col items-center transition-transform duration-150"
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: 'top center'
                }}
              >
                {/* Hall Heading Ribbon Inside Canvas */}
                <div className="w-full max-w-7xl flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60 text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                  <span>◀ {lang === 'kh' ? 'ប្លុកខាងលិច (West Block)' : 'West Wing Block'}</span>
                  <span className="text-slate-600 bg-slate-100/90 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5 shadow-2xs">
                    <Footprints size={13} className="text-blue-600" />
                    <span>{lang === 'kh' ? 'ច្រកដើរធំចំកណ្តាល (Central Boulevard)' : 'Central Exhibition Boulevard'}</span>
                  </span>
                  <span>{lang === 'kh' ? 'ប្លុកខាងកើត (East Block)' : 'East Wing Block'} ▶</span>
                </div>

                {/* Matrix Grid: gap-x-4 sm:gap-x-5 and gap-y-6 sm:gap-y-8 between rows */}
                <div
                  className={`grid gap-x-4 sm:gap-x-5 gap-y-6 sm:gap-y-8 w-full min-w-[1050px] max-w-7xl ${
                    isEditMode ? 'p-5 border-2 border-dashed border-blue-200 bg-blue-50/20 rounded-2xl' : ''
                  }`}
                  style={{
                    gridTemplateColumns: (() => {
                      const cols = gridLayout[0]?.length || 1;
                      if (isEditMode) return `repeat(${cols}, minmax(95px, 1fr))`;

                      const rows = gridLayout.length;
                      let template = '';
                      for (let c = 0; c < cols; c++) {
                        let isEmpty = true;
                        for (let r = 0; r < rows; r++) {
                          if (gridLayout[r][c] !== null && gridLayout[r][c] !== '') {
                            isEmpty = false;
                            break;
                          }
                        }
                        // Walkway corridor aisle vs booth columns
                        template += isEmpty ? ' minmax(44px, 56px)' : ' minmax(95px, 1fr)';
                      }
                      return template.trim();
                    })()
                  }}
                >
                  {gridLayout.map((row, rIdx) => (
                    row.map((cell, cIdx) => {
                      const cellKey = `cell-${rIdx}-${cIdx}`;
                      const isOver = dragOverCell === cellKey;

                      return (
                        <div
                          key={cellKey}
                          onDragOver={(e) => isEditMode && handleDragOver(e, cellKey)}
                          onDrop={(e) => isEditMode && handleDrop(e, rIdx, cIdx)}
                          className={`flex justify-center items-stretch w-full h-full ${
                            isOver ? 'ring-2 ring-blue-500 rounded-xl bg-blue-50/80' : ''
                          }`}
                        >
                          {cell ? (
                            <div className="w-full h-full">
                              {renderBoothCard(cell)}
                            </div>
                          ) : (
                            isEditMode ? (
                              <div
                                role="button"
                                tabIndex={0}
                                className={`w-full flex items-center justify-center min-h-[80px] sm:min-h-[86px] h-full rounded-xl transition-all ${
                                  isLocked
                                    ? 'border-2 border-dashed border-slate-200 bg-slate-50/40 text-slate-400 font-medium text-xs'
                                    : 'border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100 cursor-pointer text-blue-500 font-bold text-xs'
                                }`}
                                onClick={() => handleCellClickInEditMode(rIdx, cIdx)}
                              >
                                {isLocked ? '' : (lang === 'kh' ? '+ ដាក់ស្តង់' : '+ Add')}
                              </div>
                            ) : (
                              /* Architectural Walkway / Aisle Corridor Floor Marking */
                              <div className="w-full h-full min-h-[80px] sm:min-h-[86px] flex flex-col items-center justify-center pointer-events-none select-none py-0.5">
                                <div className="h-full w-full flex flex-col items-center justify-center rounded-xl bg-slate-50/60 border border-dashed border-slate-200/90 py-1.5 shadow-2xs">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest rotate-90 whitespace-nowrap">
                                    {lang === 'kh' ? 'ច្រកដើរ' : 'AISLE'}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* List View Directory */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 overflow-auto">
          <h3 className="text-base font-bold text-slate-800 mb-4">{lang === 'kh' ? 'តារាងបញ្ជីស្តង់ទាំងអស់' : 'All Booths Directory'}</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">{lang === 'kh' ? 'កូដស្តង់' : 'Code'}</th>
                <th className="py-2.5 px-3">{lang === 'kh' ? 'ស្ថានភាព' : 'Status'}</th>
                <th className="py-2.5 px-3">{lang === 'kh' ? 'ប្រភេទ' : 'Category'}</th>
                <th className="py-2.5 px-3">{lang === 'kh' ? 'ទំហំ' : 'Dimensions'}</th>
                <th className="py-2.5 px-3">{lang === 'kh' ? 'តម្លៃ' : 'Price'}</th>
                <th className="py-2.5 px-3">{lang === 'kh' ? 'អ្នកតាំងពិព័រណ៍' : 'Exhibitor'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'kh' ? 'សកម្មភាព' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {booths.map(b => {
                const bCat = getBoothCategoryType(b);
                return (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{b.booth_code}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                        b.status === 'sold' ? 'bg-blue-50 text-blue-700' :
                        b.status === 'hold' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {labels[b.status]}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {bCat === 'vip' ? (
                        <span className="inline-flex items-center gap-1 text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 text-[10px]">
                          <Crown size={12} className="text-amber-500" />
                          <span>VIP Island</span>
                        </span>
                      ) : bCat === 'corner' ? (
                        <span className="inline-flex items-center gap-1 text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 text-[10px]">
                          <Sparkles size={11} className="text-sky-600" />
                          <span>Corner Booth</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 font-medium">Standard Shell</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-medium">{b.dimensions || (bCat === 'vip' ? '6m x 6m (36m²)' : bCat === 'corner' ? '3m x 6m (18m²)' : '3m x 3m (9m²)')}</td>
                    <td className="py-2.5 px-3 font-bold text-blue-600">${b.price?.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold">{b.active_booking?.exhibitor_name || '-'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectBooth(b)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-semibold cursor-pointer"
                      >
                        {lang === 'kh' ? 'ពិនិត្យ' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Hover Card Preview */}
      {hoveredBooth && !selectedBooth && (
        <div className="fixed bottom-6 right-6 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-4 w-72 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-slate-900">{hoveredBooth.booth_code}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                hoveredBooth.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                hoveredBooth.status === 'sold' ? 'bg-blue-50 text-blue-700' :
                hoveredBooth.status === 'hold' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {labels[hoveredBooth.status]}
              </span>
            </div>
            <span className="text-xs font-bold text-blue-600">${hoveredBooth.price?.toLocaleString()}</span>
          </div>

          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">{lang === 'kh' ? 'ប្រភេទ' : 'Category'}:</span>
              <span className="font-semibold text-slate-800">
                {getBoothCategoryType(hoveredBooth) === 'vip' ? 'VIP Island' :
                 getBoothCategoryType(hoveredBooth) === 'corner' ? 'Corner Booth' : 'Standard Shell'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{lang === 'kh' ? 'ទំហំ' : 'Dimensions'}:</span>
              <span className="font-semibold text-slate-800">
                {hoveredBooth.dimensions || (getBoothCategoryType(hoveredBooth) === 'vip' ? '6m x 6m' : getBoothCategoryType(hoveredBooth) === 'corner' ? '3m x 6m' : '3m x 3m')}
              </span>
            </div>
            {hoveredBooth.active_booking && (
              <div className="pt-1.5 mt-1.5 border-t border-slate-100">
                <div className="text-slate-400 text-[11px]">{lang === 'kh' ? 'អ្នកតាំងពិព័រណ៍' : 'Exhibitor'}:</div>
                <div className="font-bold text-slate-900 truncate">{hoveredBooth.active_booking.exhibitor_name}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for adding new booth */}
      {creating && user?.role === 'admin' && (
        <ModalFrame label={t('createBoothModalTitle', 'Add New Booth')} onClose={() => setCreating(false)}>
          <form
            className="panel form-stack account-form"
            onSubmit={async e => {
              e.preventDefault();
              setIsSaving(true);
              try {
                const fields = Object.fromEntries(new FormData(e.currentTarget));
                await onCreateBooth({
                  booth_code: fields.booth_code,
                  zone: fields.zone,
                  category_id: fields.category_id ? Number(fields.category_id) : null,
                  price: Number(fields.price)
                });
                setCreating(false);
              } catch (err) {
                setFeedbackMessage({ type: 'error', text: err.message });
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <h3 className="text-lg font-bold text-slate-900">{t('createBoothModalTitle', 'Add New Booth')}</h3>
            <label className="text-xs font-bold text-slate-700">
              {t('boothCode', 'Booth Code')}
              <input name="booth_code" required maxLength={50} placeholder="e.g. E-01" className="block w-full border border-slate-200 rounded-xl p-2.5 mt-1 font-bold text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-700">
              {t('zone', 'Zone')}
              <input name="zone" defaultValue="Hall A" required className="block w-full border border-slate-200 rounded-xl p-2.5 mt-1 text-sm font-semibold" />
            </label>
            <label className="text-xs font-bold text-slate-700">
              {t('category', 'Category')}
              <select name="category_id" defaultValue={categories[0]?.id} className="block w-full border border-slate-200 rounded-xl p-2.5 mt-1 text-sm font-semibold">
                {categories.map(c => <option key={c.id} value={c.id}>{(lang === 'kh' && c.name_kh) ? c.name_kh : c.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              {t('price', 'Price (USD)')}
              <input name="price" type="number" defaultValue="1200" required className="block w-full border border-slate-200 rounded-xl p-2.5 mt-1 text-sm font-bold text-blue-600" />
            </label>

            <div className="flex justify-end gap-2.5 pt-3">
              <button type="button" className="secondary-action" onClick={() => setCreating(false)}>{t('cancel', 'Cancel')}</button>
              <button className="primary-action" disabled={isSaving}>{isSaving ? t('pleaseWait', 'Saving…') : t('createBoothModalTitle', 'Add Booth')}</button>
            </div>
          </form>
        </ModalFrame>
      )}

    </div>
  );
}
