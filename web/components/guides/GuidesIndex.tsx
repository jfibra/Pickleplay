// GuidesIndex - Main page showing all available guides
import React, { useState, useEffect } from 'react';
import useSEO from '../../hooks/useSEO';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getAllGuides, Guide } from '../../services/guides';

interface GuidesIndexProps {
    isLoggedIn: boolean;
}

const TYPE_ORDER: Record<Guide['type'], number> = { guide: 0, video: 1, quiz: 2 };

const typeLabel = (type: Guide['type']) => {
    switch (type) {
        case 'quiz': return 'Quiz';
        case 'video': return 'Video';
        default: return 'Guide';
    }
};

const actionLabel = (type: Guide['type']) => {
    switch (type) {
        case 'quiz': return 'Take the quiz';
        case 'video': return 'Watch';
        default: return 'Read';
    }
};

const guideHref = (guide: Guide) => (guide.type === 'quiz' ? '/guides/skill-rating' : `/guides/${guide.slug}`);

const GuidesIndex: React.FC<GuidesIndexProps> = ({ isLoggedIn }) => {
    useSEO({
        title: 'Pickleball Rules, Guides & Quizzes – Learn to Play',
        description: 'Learn pickleball rules, tactics, equipment, and skill ratings with guides and quizzes for beginners and advanced players in the Philippines.',
        canonical: 'https://www.pickleplay.ph/guides',
    });
    const [guides, setGuides] = useState<Guide[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGuides = async () => {
            const result = await getAllGuides();
            if (result.success) {
                setGuides([...result.data].sort((a, b) => (TYPE_ORDER[a.type] ?? 0) - (TYPE_ORDER[b.type] ?? 0)));
            }
            setLoading(false);
        };
        fetchGuides();
    }, []);

    const list = loading ? (
        <ol className="border-t border-slate-200" aria-busy="true">
            {[0, 1, 2].map((i) => (
                <li key={i} className="border-b border-slate-200 py-7 md:py-9 pl-[3.5rem] md:pl-24 animate-pulse">
                    <div className="h-7 md:h-8 bg-slate-100 rounded w-2/3 mb-3" />
                    <div className="h-4 bg-slate-100 rounded w-full max-w-2xl mb-2" />
                    <div className="h-4 bg-slate-100 rounded w-4/5 max-w-xl mb-4" />
                    <div className="h-4 bg-slate-100 rounded w-40" />
                </li>
            ))}
        </ol>
    ) : guides.length === 0 ? (
        <p className="border-t border-slate-200 pt-8 text-slate-500">No guides have been published yet.</p>
    ) : (
        <ol className="border-t border-slate-200">
            {guides.map((guide, index) => (
                <li key={guide.id} className="border-b border-slate-200">
                    <Link
                        to={guideHref(guide)}
                        className="group grid grid-cols-[2.5rem_1fr] md:grid-cols-[4rem_1fr_auto] gap-x-4 md:gap-x-8 py-7 md:py-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4 rounded-sm"
                    >
                        <span className="pt-1 text-sm md:text-base font-bold tabular-nums text-slate-500 group-hover:text-slate-950 transition-colors">
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-xl md:text-2xl font-bold text-slate-950 tracking-tight leading-snug decoration-lime-400 decoration-[3px] underline-offset-[6px] group-hover:underline">
                                {guide.title}
                            </h2>
                            {guide.description && (
                                <p className="mt-2 text-slate-600 leading-relaxed max-w-2xl">{guide.description}</p>
                            )}
                            <p className="mt-3 text-sm text-slate-500">
                                {typeLabel(guide.type)}
                                {guide.difficulty_level && <> · <span className="capitalize">{guide.difficulty_level}</span></>}
                                {guide.estimated_read_time > 0 && <> · {guide.estimated_read_time} min</>}
                            </p>
                        </div>
                        <span className="hidden md:flex items-center gap-2 self-center text-sm font-semibold text-slate-400 group-hover:text-slate-950 transition-colors whitespace-nowrap">
                            {actionLabel(guide.type)}
                            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                    </Link>
                </li>
            ))}
        </ol>
    );

    const content = (
        <div className="max-w-4xl">
            <header className="mb-10 md:mb-14">
                <h1 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tighter">Pickleball guides</h1>
                <p className="mt-4 text-lg text-slate-600 max-w-xl">
                    Short reads on the rules, the gear, and finding your level.
                </p>
            </header>

            {list}

            {!isLoggedIn && (
                <p className="mt-10 text-slate-600 max-w-2xl leading-relaxed">
                    Guests can read the opening sections of each guide and the first questions of the quiz.{' '}
                    <Link to="/signup" className="font-semibold text-slate-950 underline decoration-lime-400 decoration-2 underline-offset-4 hover:decoration-slate-950">
                        Create a free account
                    </Link>{' '}
                    to read everything and save your rating, or{' '}
                    <Link to="/login" className="font-semibold text-slate-950 underline decoration-slate-300 decoration-2 underline-offset-4 hover:decoration-slate-950">
                        log in
                    </Link>
                    .
                </p>
            )}
        </div>
    );

    if (isLoggedIn) {
        return <div className="animate-fade-in pb-12">{content}</div>;
    }

    return (
        <div className="min-h-screen bg-white pt-28 md:pt-36 pb-20 px-5 md:px-12 lg:px-24">
            <div className="max-w-6xl mx-auto">{content}</div>
        </div>
    );
};

export default GuidesIndex;
