// GuideReader - One section per screen, with a members-only gate for guests
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getGuideBySlug, updateGuideProgress, getUserGuideProgress, Guide } from '../../services/guides';
import { supabase } from '../../services/supabase';
import useSEO from '../../hooks/useSEO';
import GuideScreen, { GuideText, SegmentedProgress } from './GuideScreen';

interface GuideReaderProps {
    isLoggedIn: boolean;
}

const GuideReader: React.FC<GuideReaderProps> = ({ isLoggedIn }) => {
    const { slug } = useParams<{ slug: string }>();
    const [guide, setGuide] = useState<Guide | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentSection, setCurrentSection] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            }
        };
        checkUser();
    }, []);

    useEffect(() => {
        const fetchGuide = async () => {
            if (!slug) return;

            const result = await getGuideBySlug(slug);
            if (result.success && result.data) {
                setGuide(result.data);

                if (userId) {
                    const progressResult = await getUserGuideProgress(userId, result.data.id);
                    if (progressResult.success && progressResult.data) {
                        setCurrentSection(Math.min(progressResult.data.current_section, result.data.content.length - 1));
                    }
                }
            }
            setLoading(false);
        };
        fetchGuide();
    }, [slug, userId]);

    useEffect(() => {
        if (userId && guide) {
            updateGuideProgress(userId, guide.id, currentSection, guide.content.length);
        }
    }, [currentSection, userId, guide]);

    useSEO({
        title: guide ? `${guide.title} | Pickleball Guide Philippines` : 'Pickleball Guides',
        description: guide?.description || 'Learn pickleball rules, strategy, and equipment guides on PicklePlay Philippines.',
        canonical: slug ? `https://www.pickleplay.ph/guides/${slug}` : 'https://www.pickleplay.ph/guides',
        noIndex: !loading && !guide,
        structuredData: guide
            ? {
                '@context': 'https://schema.org',
                '@type': 'HowTo',
                name: guide.title,
                description: guide.description,
                image: guide.thumbnail_url || undefined,
                totalTime: guide.estimated_read_time ? `PT${guide.estimated_read_time}M` : undefined,
                step: guide.content.map((item) => ({
                    '@type': 'HowToStep',
                    name: item.title,
                    text: item.content,
                })),
            }
            : null,
    });

    const isLocked = useCallback(
        (index: number) => !isLoggedIn && !(guide?.content[index]?.is_free ?? false),
        [isLoggedIn, guide]
    );

    const goTo = useCallback(
        (index: number) => {
            if (!guide || index < 0 || index >= guide.content.length || isLocked(index)) return;
            setCurrentSection(index);
        },
        [guide, isLocked]
    );

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
            if (e.key === 'ArrowRight') goTo(currentSection + 1);
            if (e.key === 'ArrowLeft') goTo(currentSection - 1);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [goTo, currentSection]);

    if (loading) {
        return (
            <GuideScreen isLoggedIn={isLoggedIn}>
                <div className="animate-pulse space-y-4" aria-busy="true">
                    <div className="h-4 bg-slate-100 rounded w-24" />
                    <div className="h-10 bg-slate-100 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-5/6" />
                </div>
            </GuideScreen>
        );
    }

    if (!guide || guide.content.length === 0) {
        return (
            <GuideScreen isLoggedIn={isLoggedIn}>
                <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter">Guide not found</h1>
                <p className="mt-4 text-slate-600">
                    This guide may have been moved or unpublished.{' '}
                    <Link to="/guides" className="font-semibold text-slate-950 underline decoration-lime-400 decoration-2 underline-offset-4">
                        See all guides
                    </Link>
                    .
                </p>
            </GuideScreen>
        );
    }

    const total = guide.content.length;
    const section = guide.content[currentSection];
    const next = guide.content[currentSection + 1];
    const isLast = currentSection === total - 1;
    const nextLocked = !isLast && isLocked(currentSection + 1);

    const primaryButton = 'inline-flex items-center gap-2 rounded-full bg-slate-950 text-white px-5 md:px-6 py-3 text-sm font-semibold hover:bg-slate-800 transition-colors min-w-0';

    const footer = (
        <div className="flex items-center justify-between gap-4">
            <button
                type="button"
                onClick={() => goTo(currentSection - 1)}
                disabled={currentSection === 0}
                className="inline-flex items-center gap-2 py-3 text-sm font-semibold text-slate-500 hover:text-slate-950 disabled:invisible transition-colors shrink-0"
            >
                <ArrowLeft size={16} />
                Previous
            </button>

            {isLast ? (
                <Link to="/guides" className={primaryButton}>
                    Finish
                    <ArrowRight size={16} className="shrink-0" />
                </Link>
            ) : nextLocked ? (
                <div className="flex items-center gap-4 min-w-0">
                    <Link to="/login" className="hidden sm:inline text-sm font-semibold text-slate-500 hover:text-slate-950 transition-colors">
                        Log in
                    </Link>
                    <Link to="/signup" className={primaryButton}>
                        <span className="truncate">Sign up to keep reading</span>
                        <ArrowRight size={16} className="shrink-0" />
                    </Link>
                </div>
            ) : (
                <button type="button" onClick={() => goTo(currentSection + 1)} className={primaryButton}>
                    <span className="truncate">
                        <span className="hidden sm:inline">Next: </span>
                        <span className="sm:hidden">Next</span>
                        <span className="hidden sm:inline">{next.title}</span>
                    </span>
                    <ArrowRight size={16} className="shrink-0" />
                </button>
            )}
        </div>
    );

    return (
        <GuideScreen
            isLoggedIn={isLoggedIn}
            counter={`${currentSection + 1} / ${total}`}
            progress={
                <SegmentedProgress
                    count={total}
                    current={currentSection}
                    isLocked={isLocked}
                    onSelect={goTo}
                    labelFor={(i) => guide.content[i].title}
                />
            }
            footer={footer}
        >
            <article key={currentSection} className="animate-fade-in lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
                <div>
                    <h1 className="mb-2 text-sm font-normal text-slate-500 truncate">{guide.title}</h1>
                    <h2 className="text-2xl md:text-4xl font-black text-slate-950 tracking-tight leading-tight">
                        {section.title}
                    </h2>
                    {section.tip && (
                        <p className="hidden lg:block mt-8 text-base leading-relaxed text-slate-600">
                            <span className="font-semibold text-slate-950">Tip: </span>
                            {section.tip}
                        </p>
                    )}
                    {nextLocked && (
                        <p className="hidden lg:block mt-6 text-sm text-slate-500">
                            That's the free preview. The remaining {total - currentSection - 1} sections are for members, and an account is free.
                        </p>
                    )}
                </div>

                <div className="mt-4 md:mt-6 lg:mt-1 max-w-2xl">
                    <GuideText content={section.content} />

                    {section.tip && (
                        <p className="lg:hidden mt-5 md:mt-6 text-[15px] md:text-base leading-relaxed text-slate-600">
                            <span className="font-semibold text-slate-950">Tip: </span>
                            {section.tip}
                        </p>
                    )}
                </div>
            </article>
        </GuideScreen>
    );
};

export default GuideReader;
