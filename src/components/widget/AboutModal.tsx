import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Locale } from "@/i18n";

interface AboutModalProps {
  open: boolean;
  locale: Locale;
  onClose: () => void;
}

export function AboutModal({ open, locale, onClose }: AboutModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const isZh = locale === "zh-CN";

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--ln-theme-overlay)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-[320px] max-h-[90%] overflow-y-auto rounded-xl px-5 py-5 shadow-2xl"
        style={{ background: "var(--ln-theme-bg)", backdropFilter: "var(--ln-theme-backdrop)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "var(--ln-theme-text)" }}>
            {isZh ? "关于轻签" : "About LiteNote"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white/10"
            style={{ color: "var(--ln-theme-text-secondary)" }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Section title={isZh ? "简介" : "Intro"}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ln-theme-text-secondary)" }}>
            {isZh
              ? "轻量本地待办便签工具，数据存于本机，透明面板常驻桌面。"
              : "Lightweight local to-do note widget. Your data stays on your machine."}
          </p>
        </Section>

        <Section title={isZh ? "联系与关注" : "Contact & Follow"}>
          <div className="space-y-1">
            <LinkRow
              label={isZh ? "使用教程" : "Tutorials"}
              desc={isZh ? "B站观看功能演示与使用技巧" : "Watch demos & tips on Bilibili"}
              href="https://space.bilibili.com/399232475"
            />
          </div>
        </Section>

        <Section title={isZh ? "源码" : "Source"}>
          <div className="space-y-1">
            <IconLinkRow
              icon={<GitHubIcon />}
              label="GitHub"
              desc={isZh ? "欢迎 Star & Issue，一起完善轻签！" : "Star & Issue are welcome!"}
              href="https://github.com/zDll233/LiteNote"
            />
          </div>
        </Section>
      </div>
    </div>,
    document.body,
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-medium mb-2.5" style={{ color: "var(--ln-theme-text-muted)" }}>{title}</h3>
      {children}
    </div>
  );
}

function IconLinkRow({ icon, label, desc, href }: { icon: React.ReactNode; label: string; desc: string; href: string }) {
  return (
    <button
      type="button"
      onClick={() => { openUrl(href).catch(() => window.open(href, "_blank")); }}
      className="flex items-start rounded-lg px-2.5 py-2.5 transition text-sm w-full text-left"
      style={{ color: "var(--ln-theme-text)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ln-theme-surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="shrink-0 mt-0.5 mr-3">{icon}</div>
      <div className="flex-1"><div className="text-sm font-medium">{label}</div><div className="text-xs mt-0.5" style={{ color: "var(--ln-theme-text-muted)" }}>{desc}</div></div>
      <svg className="h-3.5 w-3.5 shrink-0 mt-1.5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ln-theme-text-muted)" }}><path d="M7 17L17 7M7 7h10v10" /></svg>
    </button>
  );
}

function LinkRow({ label, desc, href }: { label: string; desc: string; href: string }) {
  return (
    <button
      type="button"
      onClick={() => { openUrl(href).catch(() => window.open(href, "_blank")); }}
      className="flex items-start rounded-lg px-2.5 py-2.5 transition text-sm w-full text-left"
      style={{ color: "var(--ln-theme-text)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ln-theme-surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="flex-1"><div className="text-sm font-medium">{label}</div><div className="text-xs mt-0.5" style={{ color: "var(--ln-theme-text-muted)" }}>{desc}</div></div>
      <svg className="h-3.5 w-3.5 shrink-0 mt-1.5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ln-theme-text-muted)" }}><path d="M7 17L17 7M7 7h10v10" /></svg>
    </button>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--ln-theme-text)" }}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z" />
    </svg>
  );
}
