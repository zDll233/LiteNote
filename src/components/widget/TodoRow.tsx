import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTodoStore } from "@/stores/todoStore";
import type { Locale } from "@/i18n";
import { t } from "@/i18n";
import { COLOR_DOT_STYLE } from "@/lib/itemColors";
import { formatDueDate } from "@/lib/dueDate";
import { formatRecurrence, formatRecurrenceShort, computeNextDueDate } from "@/lib/recurrence";
import type { TodoItem } from "@/types/todo";
import { useNow } from "@/hooks/useNow";
import { RowActionIcon } from "./RowActionIcon";
import { Tooltip } from "./Tooltip";

/** 向上查找最近的纵向滚动容器（用于把编辑中的待办滚动进可视区） */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

interface TodoRowProps {
  todo: TodoItem;
  locale: Locale;
  selected: boolean;
  editing: boolean;
  /** 专注模式：仅展示 + 勾选，无编辑/拖拽/右键 */
  focusMode?: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onChangeText: (text: string) => void;
  onEndEdit: () => void;
  onToggleCompleted: () => void;
  /** hover 行时显示删除图标，点击后请求删除（需二次确认） */
  onRequestDelete: () => void;
  /** 由右键菜单触发的「备注与进度」气泡待办 id（null 表示无） */
  openNoteForId?: string | null;
  /** 关闭备注气泡时回调（用于清空触发源） */
  onOpenNote?: (id: string) => void;
}

export function TodoRow(props: TodoRowProps) {
  if (props.focusMode) {
    return (
      <FocusTodoRow
        todo={props.todo}
        locale={props.locale}
        onToggleCompleted={props.onToggleCompleted}
      />
    );
  }
  return <ManagementTodoRow {...props} />;
}

function FocusTodoRow({
  todo,
  locale,
  onToggleCompleted,
}: {
  todo: TodoItem;
  locale: Locale;
  onToggleCompleted: () => void;
}) {
  const accent = COLOR_DOT_STYLE[todo.colorId].background;

  return (
    <div
      data-tauri-no-drag
      className="flex min-h-12 cursor-default items-center gap-1 px-2 sm:px-3"
      style={{ borderBottom: `1px solid var(--ln-theme-border-light)` }}
    >
      {todo.isRecurring ? (
        <button
          type="button"
          data-tauri-no-drag
          aria-label={t(locale, "menuDone")}
          title={locale === "zh-CN" ? "完成本轮循环" : "Complete this cycle"}
          className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-white/50"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompleted();
          }}
        >
          <span
            className="flex h-[0.875rem] w-[0.875rem] items-center justify-center rounded-full border bg-transparent"
            style={{ borderColor: accent }}
          />
        </button>
      ) : (
        <button
          type="button"
          data-tauri-no-drag
          aria-label={t(locale, "menuDone")}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-white/50"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompleted();
          }}
        >
          <span
            className="flex h-[0.875rem] w-[0.875rem] items-center justify-center rounded-full border bg-transparent"
            style={{ borderColor: accent }}
          />
        </button>
      )}
      <div className="flex min-w-0 flex-1 flex-col py-2">
        <span
          className="whitespace-pre-wrap text-sm leading-snug"
          style={{ color: "var(--ln-theme-text)" }}
        >
          {todo.text || (locale === "zh-CN" ? "（空）" : "(empty)")}
        </span>
        {todo.note.trim() ? (
          <span className="truncate text-xs" style={{ color: "var(--ln-theme-text-secondary)" }} title={todo.note}>
            📝 {todo.note}
          </span>
        ) : null}
      </div>
      {todo.progress > 0 ? (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums"
          style={{ background: "var(--ln-theme-surface-hover)", color: "var(--ln-theme-text-secondary)" }}
          title={todo.note.trim() ? todo.note : undefined}
        >
          {todo.progress}%
        </span>
      ) : null}
    </div>
  );
}

function ManagementTodoRow({
  todo,
  locale,
  selected,
  editing,
  onSelect,
  onContextMenu,
  onChangeText,
  onEndEdit,
  onToggleCompleted,
  onRequestDelete,
  openNoteForId,
  onOpenNote,
}: Omit<TodoRowProps, "focusMode">) {
  const accent = COLOR_DOT_STYLE[todo.colorId].background;
  const trashColor = "var(--ln-theme-text-secondary)";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 行容器（用于编辑时把整行滚动进可视区）
  const rowRef = useRef<HTMLDivElement>(null);

  const setTodoNote = useTodoStore((s) => s.setTodoNote);
  const setTodoProgress = useTodoStore((s) => s.setTodoProgress);
  // 备注/进度气泡卡片展开态
  const [notePopoverOpen, setNotePopoverOpen] = useState(false);
  // 备注图标 hover 时的预览 tooltip 显隐
  const [noteTipOpen, setNoteTipOpen] = useState(false);
  const hasNote = todo.note.trim().length > 0;
  const hasProgress = todo.progress > 0;

  // 仅未完成且非编辑态的待办可拖拽
  const sortable = useSortable({
    id: todo.id,
    disabled: todo.completed || editing,
    data: { type: "todo" as const },
  });

  // 每分钟刷新当前时间戳，确保逾期状态能自动更新
  const now = useNow(60_000);

  const dueLabel = useMemo(() => {
    if (todo.dueDate <= 0) return null;

    // 循环待办：如果当前 dueDate 已过期，展示自动推进后的下一次时间
    if (todo.isRecurring && todo.dueDate <= Date.now()) {
      const nextDue = computeNextDueDate(
        todo.dueDate,
        todo.recurrenceType,
        todo.recurrenceConfig,
      );
      if (nextDue > 0) {
        return formatDueDate(nextDue, locale === "en" ? "en" : "zh-CN");
      }
      return null;
    }
    return formatDueDate(todo.dueDate, locale === "en" ? "en" : "zh-CN");
  }, [todo.dueDate, todo.isRecurring, todo.recurrenceType, todo.recurrenceConfig, locale, now]);

  const recurrenceLabel = useMemo(
    () =>
      todo.isRecurring
        ? formatRecurrence(
            todo.recurrenceType,
            todo.recurrenceConfig,
            locale === "en" ? "en" : "zh-CN",
          )
        : null,
    [todo.isRecurring, todo.recurrenceType, todo.recurrenceConfig, locale],
  );

  // 循环标签的简短描述（仅类型），具体日期放在 title 中悬停查看
  const recurrenceLabelShort = useMemo(
    () =>
      todo.isRecurring
        ? formatRecurrenceShort(
            todo.recurrenceType,
            todo.recurrenceConfig,
            locale === "en" ? "en" : "zh-CN",
          )
        : null,
    [todo.isRecurring, todo.recurrenceType, todo.recurrenceConfig, locale],
  );

  // 编辑态：textarea 高度跟随内容完全展开（不再固定行数 + 内部滚动）
  const resizeEditingTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // 编辑中：把光标所在（末尾）位置保持在列表可视区内
  const keepEditingCaretVisible = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const scroller = findScrollParent(el);
    if (!scroller) return;
    const pad = 8;
    const viewport = scroller.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    if (rect.bottom > viewport.bottom - pad) {
      scroller.scrollTop += Math.min(rect.bottom - viewport.bottom + pad, rect.height);
    }
  }, []);

  // 进入编辑态时，光标定位到文本末尾，并确保编辑区落在可视区内
  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    rowRef.current?.scrollIntoView({ block: "nearest" });
    keepEditingCaretVisible();
  }, [editing, keepEditingCaretVisible]);

  // 高度随内容自适应（换行/回车/粘贴后立即重算，避免出现内部滚动条）
  useLayoutEffect(() => {
    if (!editing) return;
    resizeEditingTextarea();
    const el = textareaRef.current;
    // 在文本末尾连续输入时，保证光标所在行不会被挤出列表可视区
    if (el && el.selectionStart === el.value.length) {
      keepEditingCaretVisible();
    }
  }, [editing, todo.text, resizeEditingTextarea, keepEditingCaretVisible]);

  // 宽度变化（窗口缩放、列表出现滚动条）会重新换行，需要按新宽度重算高度
  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = -1;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      resizeEditingTextarea();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [editing, resizeEditingTextarea]);

  // 备注/进度气泡卡片：Esc 关闭 + 外部点击关闭
  // 右键菜单触发时，自动展开该待办的气泡
  useEffect(() => {
    if (openNoteForId && openNoteForId === todo.id) {
      setNotePopoverOpen(true);
    }
  }, [openNoteForId, todo.id]);
  useEffect(() => {
    if (!notePopoverOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rowRef.current && !rowRef.current.contains(target)) {
        setNotePopoverOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotePopoverOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    // 关闭时若由右键菜单触发，则清空触发源
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      if (openNoteForId && openNoteForId === todo.id && onOpenNote) {
        onOpenNote(todo.id);
      }
    };
  }, [notePopoverOpen, openNoteForId, todo.id, onOpenNote]);

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  // 编辑框字号/行高与展示态保持一致：全局 input/textarea 的 font: inherit 会覆盖 text-* 工具类，
  // 若不显式指定，进入编辑时文字会突然从 14px 变成 16px 并重新折行
  const editingTextStyle: React.CSSProperties = {
    color: "var(--ln-theme-text)",
    fontSize: "0.875rem",
    lineHeight: 1.375,
  };

  return (
    <div
      ref={(node) => {
        sortable.setNodeRef(node);
        rowRef.current = node;
      }}
      {...sortable.attributes}
      {...sortable.listeners}
      data-tauri-no-drag
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e);
      }}
      className={
        "group relative flex min-h-12 cursor-default items-center gap-1 px-2 touch-none sm:px-3 " +
        (sortable.isDragging ? "opacity-0" : "") +
        (!selected ? " hover:bg-[var(--ln-theme-surface-hover)]" : "")
      }
      style={{
        ...style,
        borderBottom: `1px solid var(--ln-theme-border-light)`,
        background: selected ? "var(--ln-theme-surface-active)" : "transparent",
      }}
    >
      {/* 循环待办：显示可点击的完成按钮（带循环角标） */}
      {todo.isRecurring ? (
        <button
          type="button"
          data-tauri-no-drag
          aria-label={t(locale, "menuDone")}
          title={locale === "zh-CN" ? "完成本轮循环" : "Complete this cycle"}
          className={
            "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full outline-none transition " +
            "focus-visible:ring-2 focus-visible:ring-white/50"
          }
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompleted();
          }}
        >
          <span
            className="flex h-[0.875rem] w-[0.875rem] items-center justify-center rounded-full border bg-transparent"
            style={{ borderColor: accent }}
          />
        </button>
      ) : (
        <button
          type="button"
          data-tauri-no-drag
          aria-pressed={todo.completed}
          aria-label={todo.completed ? t(locale, "menuUndone") : t(locale, "menuDone")}
          className={
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full outline-none transition " +
            "focus-visible:ring-2 focus-visible:ring-white/50"
          }
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompleted();
          }}
        >
          <span
            className={
              "flex h-[0.875rem] w-[0.875rem] items-center justify-center rounded-full border text-[0.5rem] font-semibold leading-none " +
              (todo.completed ? "border-transparent text-white" : "bg-transparent")
            }
            style={
              todo.completed
                ? { background: accent, boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.2)" }
                : { borderColor: accent }
            }
          >
            {todo.completed ? "✓" : null}
          </span>
        </button>
      )}
      <button
        type="button"
        data-tauri-no-drag
        className="flex min-w-0 flex-1 items-center py-1 text-left cursor-pointer bg-transparent border-0"
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        {editing ? (
          <textarea
            ref={textareaRef}
            data-tauri-no-drag
            className="min-h-10 w-0 flex-1 resize-none overflow-hidden bg-transparent text-sm leading-snug outline-none ring-0"
            style={editingTextStyle}
            rows={1}
            value={todo.text}
            onChange={(e) => onChangeText(e.target.value)}
            onBlur={onEndEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                (e.target as HTMLTextAreaElement).blur();
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLTextAreaElement).blur();
              } else if (e.key === "Enter" && e.shiftKey) {
                e.stopPropagation(); // 允许默认换行，阻止冒泡到父按钮
              } else if (e.key === " ") {
                e.stopPropagation(); // 允许输入空格，阻止冒泡到父按钮
              }
            }}
          />
        ) : (
          <div className="flex min-w-0 flex-1 flex-col py-0.5">
            <div className="flex items-center gap-1.5">
              {recurrenceLabelShort ? (
                <Tooltip content={recurrenceLabel ?? undefined}>
                  <span
                    className="shrink-0 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[0.65rem] font-medium leading-none"
                    style={{ color: accent, borderColor: accent }}
                  >
                    ↻ {recurrenceLabelShort}
                  </span>
                </Tooltip>
              ) : null}
              <span
                className={
                  "min-w-0 flex-1 whitespace-pre-wrap text-sm leading-snug" +
                  (todo.completed && !todo.isRecurring ? " opacity-50 line-through" : "")
                }
                style={{ color: "var(--ln-theme-text)" }}
              >
                {todo.text || (locale === "zh-CN" ? "（空）" : "(empty)")}
              </span>
            </div>
            {(todo.pinned || dueLabel) ? (
              <div className="mt-0.5 flex items-center gap-1.5">
                {todo.pinned ? (
                  <span className="text-xs" style={{ color: "var(--ln-theme-text-secondary)" }}>
                    ↑ {locale === "zh-CN" ? "置顶" : "Pinned"}
                  </span>
                ) : null}
                {dueLabel ? (
                  <span className="text-xs"
                    style={{ color: todo.completed ? "var(--ln-theme-text-muted)" : "var(--ln-theme-text-secondary)" }}
                  >
                    {dueLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </button>
      <Tooltip
        placement="bottom"
        align="end"
        trigger="manual"
        open={noteTipOpen && !notePopoverOpen}
        content={
          hasProgress || hasNote ? (
            <>
              {hasProgress ? (
                <div className="mb-1 flex items-center gap-2">
                  <span style={{ color: "var(--ln-theme-text-secondary)" }}>
                    {locale === "zh-CN" ? "进度" : "Progress"}
                  </span>
                  <span className="font-semibold tabular-nums">{todo.progress}%</span>
                </div>
              ) : null}
              {hasNote ? (
                <div className="whitespace-pre-wrap break-words leading-snug" style={{ color: "var(--ln-theme-text)" }}>
                  {todo.note}
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ color: "var(--ln-theme-text-secondary)" }}>
              {locale === "zh-CN" ? "点击添加备注与进度" : "Click to add note & progress"}
            </div>
          )
        }
      >
        <RowActionIcon
          aria-label={locale === "zh-CN" ? "备注与进度" : "Note & progress"}
          style={{ color: "var(--ln-theme-text-secondary)" }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseEnter={() => setNoteTipOpen(true)}
          onMouseLeave={() => setNoteTipOpen(false)}
          onClick={(e) => {
            e.stopPropagation();
            setNoteTipOpen(false);
            setNotePopoverOpen((v) => !v);
          }}
        >
          <NoteIcon className="h-4 w-4" />
        </RowActionIcon>
      </Tooltip>
      <RowActionIcon
        variant="danger"
        aria-label={locale === "zh-CN" ? "删除待办" : "Delete todo"}
        style={{ color: trashColor }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete();
        }}
      >
        <TrashIcon className="h-4 w-4" />
      </RowActionIcon>
      {/* 备注与进度气泡卡片 */}
      {notePopoverOpen ? (
        <div
          data-tauri-no-drag
          className="absolute right-1 top-full z-20 mt-1 w-64 rounded-lg border p-3 shadow-xl"
          style={{
            background: "var(--ln-theme-surface)",
            borderColor: "var(--ln-theme-border)",
            color: "var(--ln-theme-text)",
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 text-xs font-semibold" style={{ color: "var(--ln-theme-text-secondary)" }}>
            {locale === "zh-CN" ? "进度" : "Progress"}
          </div>
          <div className="mb-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={todo.progress}
              className="h-1.5 flex-1 cursor-pointer accent-current"
              style={{ color: accent }}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => setTodoProgress(todo.id, Number(e.target.value))}
            />
            <span className="w-9 text-right text-xs tabular-nums" style={{ color: "var(--ln-theme-text)" }}>
              {todo.progress}%
            </span>
          </div>
          <div className="mb-2 flex gap-1">
            <button
              type="button"
              className="rounded px-2 py-0.5 text-xs hover:bg-white/10"
              style={{ color: "var(--ln-theme-text-secondary)" }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setTodoProgress(todo.id, Math.max(0, todo.progress - 5))}
            >
              −5
            </button>
            <button
              type="button"
              className="rounded px-2 py-0.5 text-xs hover:bg-white/10"
              style={{ color: "var(--ln-theme-text-secondary)" }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setTodoProgress(todo.id, Math.min(100, todo.progress + 5))}
            >
              +5
            </button>
            <button
              type="button"
              className="rounded px-2 py-0.5 text-xs hover:bg-white/10"
              style={{ color: "var(--ln-theme-text-secondary)" }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setTodoProgress(todo.id, 0)}
            >
              {locale === "zh-CN" ? "清除" : "Clear"}
            </button>
          </div>
          <div className="mb-1 text-xs font-semibold" style={{ color: "var(--ln-theme-text-secondary)" }}>
            {locale === "zh-CN" ? "备注" : "Note"}
          </div>
          <textarea
            data-tauri-no-drag
            className="h-20 w-full resize-none rounded border bg-transparent p-1.5 text-sm outline-none focus:ring-1"
            style={{
              borderColor: "var(--ln-theme-border)",
              color: "var(--ln-theme-text)",
            }}
            placeholder={locale === "zh-CN" ? "添加备注…" : "Add a note…"}
            value={todo.note}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => setTodoNote(todo.id, e.target.value)}
            onKeyDown={(e) => {
              // 阻止回车/空格冒泡到 dnd-kit 的 sortable 监听器，避免触发拖拽排序
              if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
                e.stopPropagation();
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** 备注图标 */
function NoteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

/** 删除图标（hover 行时显示），颜色由父元素的 text-* 控制（跟随主题深浅） */
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
