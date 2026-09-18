import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Trophy,
  Copy,
  CheckCircle2,
  ExternalLink,
  Share2,
} from 'lucide-react';
import StepBasics from './StepBasics';
import StepCategories from './StepCategories';
import StepReview from './StepReview';
import {
  STEP_FIELD_GROUPS,
  STEP_META,
  createTournamentFormSchema,
  getDefaultFormValues,
  toApiPayload,
  type CreateTournamentFormValues,
  type CreateTournamentSubmitResult,
} from './schema';
import { tournamentPublicUrl } from '../../tournaments/tournamentExtras';

export type CreateTournamentCreatedInfo = {
  id: string;
  name: string;
};

export type CreateTournamentFormProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Called with API payload; return created tournament so the success/share UI can render. */
  onSubmit: (
    result: CreateTournamentSubmitResult,
  ) => void | Promise<void | CreateTournamentCreatedInfo>;
  title?: string;
};

const LAST_STEP = STEP_META.length - 1;

const CreateTournamentForm: React.FC<CreateTournamentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title = 'Create Tournament',
}) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateTournamentCreatedInfo | null>(null);
  const [copied, setCopied] = useState(false);
  /** Prevents the Next→Create button swap from auto-firing create on the same click. */
  const [createArmed, setCreateArmed] = useState(false);

  const stepRef = useRef(0);
  stepRef.current = step;

  const methods = useForm<CreateTournamentFormValues>({
    resolver: zodResolver(createTournamentFormSchema) as Resolver<CreateTournamentFormValues>,
    defaultValues: getDefaultFormValues(),
    mode: 'onBlur',
  });

  const { trigger, reset, getValues } = methods;
  const isLastStep = step === LAST_STEP;
  const shareUrl = created ? tournamentPublicUrl(created.id) : '';

  useEffect(() => {
    if (step !== LAST_STEP) {
      setCreateArmed(false);
      return;
    }
    // Arm only after the review step has settled (avoids accidental submit from Next click).
    setCreateArmed(false);
    const timer = window.setTimeout(() => setCreateArmed(true), 450);
    return () => window.clearTimeout(timer);
  }, [step]);

  const hardReset = () => {
    reset(getDefaultFormValues());
    setStep(0);
    stepRef.current = 0;
    setSubmitError(null);
    setCreated(null);
    setCopied(false);
    setCreateArmed(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    hardReset();
    onClose();
  };

  const goNext = async () => {
    const fields = [...STEP_FIELD_GROUPS[stepRef.current]];
    const valid = await trigger(fields as (keyof CreateTournamentFormValues)[]);
    if (!valid) return;
    setSubmitError(null);
    setStep((s) => Math.min(s + 1, LAST_STEP));
  };

  const goBack = () => {
    setSubmitError(null);
    setCreateArmed(false);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleCreateClick = async () => {
    // Hard gates — never create unless admin is on review and create is armed
    if (stepRef.current !== LAST_STEP || !createArmed || isSubmitting) return;

    const valid = await trigger();
    if (!valid) {
      setSubmitError('Please fix the highlighted fields before creating.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = toApiPayload(getValues());
      const createdInfo = await onSubmit(result);
      if (createdInfo?.id) {
        setCreated(createdInfo);
      } else {
        setSubmitError('Tournament was created but no share link was returned. Check Tournament Ops.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tournament';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const blockImplicitSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
  };

  const blockEnterSubmit: React.KeyboardEventHandler<HTMLFormElement> = (e) => {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    if (tag === 'TEXTAREA') return;
    // Stop Enter inside inputs/selects from submitting or advancing
    e.preventDefault();
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setSubmitError('Could not copy link. Copy it manually from the field below.');
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-4 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 items-center justify-center shrink-0">
              {created ? <CheckCircle2 size={22} className="text-emerald-600" /> : <Trophy size={22} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase truncate">
                {created ? 'Tournament Live' : title}
              </h2>
              <p className="text-slate-400 text-xs font-bold mt-1">
                {created
                  ? 'Share the player registration link'
                  : `Step ${step + 1} of ${STEP_META.length} — ${STEP_META[step].title}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {created ? (
          <div className="flex-1 overflow-y-auto px-8 py-2 space-y-5 animate-in fade-in duration-300">
            <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={20} />
                <p className="text-sm font-black uppercase tracking-widest">Created & approved</p>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{created.name}</h3>
              <p className="text-sm text-slate-500 font-medium">
                Players can open this link to view details and register.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Player join link
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700 outline-none"
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>

            {submitError && (
              <p className="text-rose-600 text-sm font-bold bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                {submitError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-6">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                <ExternalLink size={14} /> Open player page
              </a>
              <button
                type="button"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: created.name,
                        text: `Register for ${created.name} on PicklePlay`,
                        url: shareUrl,
                      });
                      return;
                    } catch {
                      /* user cancelled */
                    }
                  }
                  await copyShareLink();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
              >
                <Share2 size={14} /> Share
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-8 pb-4 shrink-0">
              <div className="flex gap-2">
                {STEP_META.map((meta, i) => (
                  <div key={meta.id} className="flex-1 space-y-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-colors ${
                        i <= step ? 'bg-blue-600' : 'bg-slate-100'
                      }`}
                    />
                    <p
                      className={`text-[9px] font-black uppercase tracking-widest truncate ${
                        i === step ? 'text-blue-600' : i < step ? 'text-slate-500' : 'text-slate-300'
                      }`}
                    >
                      {meta.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <FormProvider {...methods}>
              <form
                onSubmit={blockImplicitSubmit}
                onKeyDown={blockEnterSubmit}
                className="flex flex-col flex-1 min-h-0"
                noValidate
              >
                <div className="flex-1 overflow-y-auto px-8 py-2 space-y-2">
                  <p className="text-sm text-slate-500 font-medium mb-4">{STEP_META[step].subtitle}</p>
                  {step === 0 && <StepBasics />}
                  {step === 1 && <StepCategories />}
                  {step === 2 && <StepReview />}
                  {submitError && (
                    <p className="text-rose-600 text-sm font-bold bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                      {submitError}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center justify-between gap-3 px-8 py-6 border-t border-slate-100 bg-white">
                  <button
                    type="button"
                    onClick={step === 0 ? handleClose : goBack}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    {step === 0 ? (
                      'Cancel'
                    ) : (
                      <>
                        <ChevronLeft size={18} /> Back
                      </>
                    )}
                  </button>

                  {!isLastStep ? (
                    <button
                      type="button"
                      onClick={() => void goNext()}
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting || !createArmed}
                      onClick={() => void handleCreateClick()}
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-60 transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Submitting…
                        </>
                      ) : !createArmed ? (
                        <>Review details…</>
                      ) : (
                        <>
                          <Check size={16} /> Create Tournament
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </FormProvider>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default CreateTournamentForm;
