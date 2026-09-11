import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Copy, Share2, BookOpen, Play, FolderOpen } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  divider?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  children: React.ReactNode;
  items: ContextMenuItem[];
  disabled?: boolean;
}

interface MenuPosition {
  x: number;
  y: number;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ children, items, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (disabled) return;

    e.preventDefault();
    e.stopPropagation();

    // Calculate position
    const x = e.clientX;
    const y = e.clientY;

    // Adjust position to keep menu in viewport
    const menuWidth = 220;
    const menuHeight = items.length * 44 + 16;

    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
    const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

    setPosition({
      x: Math.max(8, adjustedX),
      y: Math.max(8, adjustedY)
    });
    setIsOpen(true);
  }, [disabled, items.length]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.disabled) return;
    item.onClick();
    handleClose();
  }, [handleClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleScroll = () => {
      handleClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, handleClose]);

  const menu = isOpen && createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[200px] py-2 rounded-xl overflow-hidden animate-scale-in"
      style={{
        left: position.x,
        top: position.y,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
      }}
    >
      {/* Glass shine effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
        }}
      />

      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.divider && index > 0 && (
            <div className="my-1.5 mx-3 h-px bg-[var(--glass-border)]" />
          )}
          <button
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            className={`
              relative w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
              transition-all duration-200
              ${item.disabled
                ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                : 'text-[var(--color-text-primary)] hover:bg-[var(--glass-bg-hover)] cursor-pointer'
              }
            `}
          >
            {item.icon && (
              <span className="w-4 h-4 flex-shrink-0 text-[var(--color-text-muted)]">
                {item.icon}
              </span>
            )}
            <span className="flex-1 font-medium">{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>,
    document.body
  );

  return (
    <>
      <div
        ref={triggerRef}
        onContextMenu={handleContextMenu}
        className="contents"
      >
        {children}
      </div>
      {menu}
    </>
  );
};

// Helper function to create common menu items
export const createOpenInNewTabItem = (url: string): ContextMenuItem => ({
  label: 'Abrir em nova aba',
  icon: <ExternalLink className="w-4 h-4" />,
  onClick: () => window.open(url, '_blank'),
});

export const createCopyLinkItem = (url: string): ContextMenuItem => ({
  label: 'Copiar link',
  icon: <Copy className="w-4 h-4" />,
  onClick: () => {
    navigator.clipboard.writeText(window.location.origin + url);
  },
});

export const createShareItem = (title: string, url: string): ContextMenuItem => ({
  label: 'Compartilhar',
  icon: <Share2 className="w-4 h-4" />,
  onClick: async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: window.location.origin + url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.origin + url);
    }
  },
});

// Pre-built context menu items for common use cases
export const ContextMenuIcons = {
  ExternalLink,
  Copy,
  Share2,
  BookOpen,
  Play,
  FolderOpen,
};

export default ContextMenu;
