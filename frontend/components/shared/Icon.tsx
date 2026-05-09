// frontend/components/shared/Icon.tsx
// Libreria icone SVG inline — porta da primitives.jsx
// Usata in tutta l'app per mantenere consistenza visiva

import React from "react";

interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function Icon({ name, size = 20, stroke = 1.8, style, className }: IconProps) {
  const s = size;
  const sw = stroke;
  const common = {
    width: s, height: s, viewBox: "0 0 24 24" as const,
    fill: "none" as const, stroke: "currentColor",
    strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    style, className,
  };

  switch (name) {
    case "home":
      return <svg {...common}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>;
    case "compass":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>;
    case "map":
      return <svg {...common}><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14"/><path d="M15 6v14"/></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>;
    case "bell":
      return <svg {...common}><path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 004 0"/></svg>;
    case "share":
      return <svg {...common}><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/></svg>;
    case "link":
      return <svg {...common}><path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 10-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 105.66 5.66l1-1"/></svg>;
    case "check":
      return <svg {...common}><path d="M5 12l5 5L20 7"/></svg>;
    case "x":
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case "chevron-left":
      return <svg {...common}><path d="M15 18l-6-6 6-6"/></svg>;
    case "chevron-right":
      return <svg {...common}><path d="M9 6l6 6-6 6"/></svg>;
    case "chevron-down":
      return <svg {...common}><path d="M6 9l6 6 6-6"/></svg>;
    case "more":
      return <svg {...common}><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
    case "bed":
      return <svg {...common}><path d="M3 18V8M3 14h18v4"/><path d="M21 18V12a3 3 0 00-3-3h-7v5"/><circle cx="7" cy="11.5" r="1.5"/></svg>;
    case "plane":
      return <svg {...common}><path d="M3 13l8-1L3 6l2-1 11 5 4-1.5a2 2 0 110 4L7 17l-2-1 6-3z"/></svg>;
    case "fork":
      return <svg {...common}><path d="M7 3v8a3 3 0 003 3v7"/><path d="M11 3v8M7 7h4"/><path d="M17 3c-2 1-3 4-3 7s2 4 3 4v7"/></svg>;
    case "pin":
      return <svg {...common}><path d="M12 22s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>;
    case "star":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" stroke="none" style={style} className={className}><path d="M12 3l2.7 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.3 6.5 20.3l1.1-6.3L3 9.6l6.3-.9z"/></svg>;
    case "heart":
      return <svg {...common}><path d="M12 21s-7-4.5-9-10A5 5 0 0112 7a5 5 0 019 4c-2 5.5-9 10-9 10z"/></svg>;
    case "image":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 16l-5-5L5 21"/></svg>;
    case "camera":
      return <svg {...common}><path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="4"/></svg>;
    case "wa":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" style={style} className={className}><path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9s-.5-.2-.7.2-.8.9-1 1.1-.4.2-.7.1c-.9-.4-1.8-1-2.6-1.8-.7-.7-1.2-1.5-1.6-2.4-.2-.4 0-.5.1-.7.1-.2.3-.4.5-.6l.3-.5c.1-.2 0-.3 0-.5l-.8-2c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.3s.3-1.2.2-1.3c-.1-.1-.3-.2-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.3-1.4c1.4.7 3 1.1 4.7 1.1h0c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3c-.8-1.3-1.2-2.7-1.2-4.2 0-4.5 3.7-8.2 8.2-8.2s8.2 3.7 8.2 8.2-3.7 8-8.2 8z"/></svg>;
    case "thumbs-up":
      return <svg {...common}><path d="M7 21V10l5-7c1 0 2 1 2 2v5h6a2 2 0 012 2l-2 8a2 2 0 01-2 2H7z"/><path d="M7 10H3v11h4"/></svg>;
    case "thumbs-down":
      return <svg {...common}><path d="M17 3v11l-5 7c-1 0-2-1-2-2v-5H4a2 2 0 01-2-2l2-8a2 2 0 012-2h11z"/><path d="M17 14h4V3h-4"/></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "users":
      return <svg {...common}><circle cx="9" cy="8" r="3.5"/><path d="M2 21c.5-3.5 3.5-5.5 7-5.5s6.5 2 7 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.5 0 5 1.5 5.5 4"/></svg>;
    case "filter":
      return <svg {...common}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case "send":
      return <svg {...common}><path d="M3 11l18-8-8 18-2-8z"/></svg>;
    case "globe":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 010 18M12 3a13 13 0 000 18"/></svg>;
    case "spark":
      return <svg {...common}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2"/></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5h0a1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>;
    case "logout":
      return <svg {...common}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>;
    case "edit":
      return <svg {...common}><path d="M11 4H5a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-6"/><path d="M18.5 2.5a2.1 2.1 0 113 3L12 15l-4 1 1-4z"/></svg>;
    case "trash":
      return <svg {...common}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>;
    case "copy":
      return <svg {...common}><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
    case "external":
      return <svg {...common}><path d="M14 3h7v7M21 3l-9 9M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6"/></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case "yes":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style} className={className}><path d="M5 12l5 5L20 7"/></svg>;
    case "maybe":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style} className={className}><circle cx="12" cy="12" r="3.5"/></svg>;
    case "no":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style} className={className}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case "comments":
      return <svg {...common}><path d="M21 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h13a2 2 0 012 2z"/></svg>;
    default:
      return null;
  }
}
