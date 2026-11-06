// GuideScreen - One-screen frame shared by the guide reader and the skill quiz
import React, { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface GuideScreenProps {
    isLoggedIn: boolean;
    counter?: React.ReactNode;
    progress?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
}

// Content is scaled down to this factor at most to fit the screen; past that the
// content area scrolls instead of shrinking text further.
const MIN_FIT_SCALE = 0.8;

// Guests get the fixed site header (h-16 / md:h-20) over the page; signed-in users
// get the mobile app header (h-16) and no header on desktop. Height uses the smaller of
// dvh and vh because the app's scroll container is h-screen (100vh).
const GuideScreen: React.FC<GuideScreenProps> = ({ isLoggedIn, counter, progress, footer, children }) => {
    const areaRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const area = areaRef.current;
        const content = contentRef.current;
        if (!area || !content) return;

        const fit = () => {
            content.style.zoom = '1';
            const available = area.clientHeight - parseFloat(getComputedStyle(area).paddingTop);
            const needed = content.scrollHeight;
            if (needed <= available) return;
            let scale = Math.max(MIN_FIT_SCALE, available / needed);
            content.style.zoom = String(scale);
            // Narrower effective width rewraps text, so correct once more.
            const after = content.scrollHeight * scale;
            if (after > available && scale > MIN_FIT_SCALE) {
                scale = Math.max(MIN_FIT_SCALE, scale * (available / after));
                content.style.zoom = String(scale);
            }
        };

        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(area);
        return () => observer.disconnect();
    }, [children]);

    return (
        <div className={`flex flex-col overflow-hidden bg-white ${isLoggedIn ? 'h-[calc(min(100dvh,100vh)-4rem)] md:h-[min(100dvh,100vh)]' : 'h-[min(100dvh,100vh)] pt-16 md:pt-20'}`}>
            <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex flex-col px-5 md:px-10 pt-5 md:pt-8 pb-4 md:pb-6">
                <div className="shrink-0 flex items-center justify-between text-sm">
                    <Link to="/guides" className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-950 transition-colors">
                        <ArrowLeft size={16} />
                        Guides
                    </Link>
                    {counter && <span className="tabular-nums text-slate-500">{counter}</span>}
                </div>
                {progress && <div className="shrink-0 mt-4">{progress}</div>}

                <div ref={areaRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-5 md:pt-8">
                    <div ref={contentRef}>{children}</div>
                </div>

                {footer && <div className="shrink-0 mt-3 pt-3 md:mt-4 md:pt-5 border-t border-slate-200">{footer}</div>}
            </div>
        </div>
    );
};

interface SegmentedProgressProps {
    count: number;
    current: number;
    isLocked?: (index: number) => boolean;
    onSelect?: (index: number) => void;
    labelFor?: (index: number) => string;
}

export const SegmentedProgress: React.FC<SegmentedProgressProps> = ({ count, current, isLocked, onSelect, labelFor }) => (
    <div className="flex gap-1">
        {Array.from({ length: count }, (_, i) => {
            const locked = isLocked?.(i) ?? false;
            const tone = i < current ? 'bg-slate-950' : i === current ? 'bg-lime-400' : locked ? 'bg-slate-100' : 'bg-slate-200';
            const bar = <span className={`block h-1.5 w-full rounded-full transition-colors ${tone}`} />;
            if (!onSelect) return <span key={i} className="flex-1">{bar}</span>;
            return (
                <button
                    key={i}
                    type="button"
                    onClick={() => onSelect(i)}
                    disabled={locked}
                    title={locked ? 'Members only' : labelFor?.(i)}
                    aria-label={labelFor ? `${i + 1}. ${labelFor(i)}${locked ? ' (members only)' : ''}` : `Go to ${i + 1}`}
                    aria-current={i === current ? 'step' : undefined}
                    className="flex-1 py-2 -my-2 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-blue-600 focus-visible:[&>span]:ring-offset-2"
                >
                    {bar}
                </button>
            );
        })}
    </div>
);

const renderInline = (text: string) =>
    text.split('**').map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-950">{part}</strong> : part));

type Block = { kind: 'p'; text: string } | { kind: 'ul' | 'ol'; items: string[] };

// Guide content is plain text with blank-line paragraphs, "- " / "1. " list lines and **bold**.
export const GuideText: React.FC<{ content: string }> = ({ content }) => {
    const blocks: Block[] = [];
    for (const raw of content.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        const bullet = line.match(/^[-•]\s+(.*)$/);
        const numbered = line.match(/^\d+\.\s+(.*)$/);
        const kind = bullet ? 'ul' : numbered ? 'ol' : null;
        const last = blocks[blocks.length - 1];
        if (kind) {
            const item = (bullet ?? numbered)![1];
            if (last && last.kind === kind) last.items.push(item);
            else blocks.push({ kind, items: [item] });
        } else {
            blocks.push({ kind: 'p', text: line });
        }
    }

    return (
        <div className="space-y-2 md:space-y-3 text-[15px] md:text-[17px] leading-relaxed text-slate-700">
            {blocks.map((block, i) => {
                if (block.kind === 'p') return <p key={i}>{renderInline(block.text)}</p>;
                const List = block.kind === 'ul' ? 'ul' : 'ol';
                return (
                    <List key={i} className={`pl-5 space-y-1 ${block.kind === 'ul' ? 'list-disc marker:text-slate-300' : 'list-decimal marker:text-slate-400 marker:font-semibold'}`}>
                        {block.items.map((item, j) => <li key={j} className="pl-1">{renderInline(item)}</li>)}
                    </List>
                );
            })}
        </div>
    );
};

export default GuideScreen;
