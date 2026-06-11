import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import './Interview.css';

// ── Silence / timing thresholds (ms) ─────────────────────────────────────────
const SILENCE_NO_SPEECH = 10000;   // no speech at all → "are you there?" prompt
const SILENCE_AFTER_PROMPT = 10000; // still silent after prompt → skip question
const SILENCE_ANSWER_DONE = 4000;  // pause after speaking or typing → answer complete
const MAX_ANSWER_MS = 120000;      // hard cap per answer

function computeCountdown(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 'Expired';
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const sec = s % 60;
  return `${d}d ${h}h ${sec}s`;
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function Interview({ token }) {
  // page: loading | error | intro | interview | submitting | done
  const [page, setPage] = useState('loading');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [preparing, setPreparing] = useState(false);

  const [qIndex, setQIndex] = useState(0);
  // phase: speaking | listening | idle
  const [phase, setPhase] = useState('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const recognitionRef = useRef(null);
  const answersRef = useRef([]);
  const transcriptRef = useRef('');
  const lastSpeechTimeRef = useRef(null);
  const listenStartRef = useRef(null);
  const promptedRef = useRef(false);
  const watchdogRef = useRef(null);
  const phaseRef = useRef('idle');
  const qIndexRef = useRef(0);
  const questionsRef = useRef([]);
  const finishedRef = useRef(false);
  const isEditingRef = useRef(false);

  const [expiryCountdown, setExpiryCountdown] = useState('');
  useEffect(() => {
    if (!info?.expiresAt) return;
    const tick = () => setExpiryCountdown(computeCountdown(info.expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [info?.expiresAt]);

  const setPhaseSafe = (p) => { phaseRef.current = p; setPhase(p); };

  // ── Load interview info ─────────────────────────────────────────────────
  useEffect(() => {
    api.getInterviewInfo(token)
      .then(data => { setInfo(data); setPage('intro'); })
      .catch(err => { setError(err.message || 'Invalid or expired interview link.'); setPage('error'); });

    return () => {
      stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stopEverything = () => {
    if (watchdogRef.current) { clearInterval(watchdogRef.current); watchdogRef.current = null; }
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
  };

  // ── TTS ────────────────────────────────────────────────────────────────
  const speak = useCallback((text, onDone) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && /female|zira|aria|jenny/i.test(v.name))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;
    utter.onend = () => onDone && onDone();
    utter.onerror = () => onDone && onDone();
    window.speechSynthesis.speak(utter);
  }, []);

  // ── STT ────────────────────────────────────────────────────────────────
  const startRecognition = () => {
    if (!SpeechRecognition) return;
    // already running
    if (recognitionRef.current) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      // Don't override what the user is manually editing
      if (isEditingRef.current) return;
      let finalText = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      const combined = (finalText + interim).trim();
      if (combined) {
        transcriptRef.current = combined;
        lastSpeechTimeRef.current = Date.now();
        setLiveTranscript(combined);
      }
    };

    rec.onend = () => {
      // Chrome stops recognition on its own; restart while we're still listening
      if (phaseRef.current === 'listening' && recognitionRef.current === rec) {
        try { rec.start(); } catch { /* noop */ }
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone access denied. Please allow microphone access and reload the page.');
        setPage('error');
        stopEverything();
      }
    };

    recognitionRef.current = rec;
    try { rec.start(); } catch { /* noop */ }
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try { rec.onend = null; rec.stop(); } catch { /* noop */ }
    }
  };

  // ── Question flow ──────────────────────────────────────────────────────
  const askQuestion = useCallback((idx) => {
    const qs = questionsRef.current;
    if (idx >= qs.length) { finishInterview(); return; }

    qIndexRef.current = idx;
    setQIndex(idx);
    transcriptRef.current = '';
    setLiveTranscript('');
    promptedRef.current = false;
    lastSpeechTimeRef.current = null;
    isEditingRef.current = false;

    // AI speaks — mic OFF
    stopRecognition();
    setPhaseSafe('speaking');
    setStatusMsg('');

    const intro = idx === 0 ? 'Let\u2019s begin. Question one. ' : `Question ${idx + 1}. `;
    speak(intro + qs[idx], () => {
      // AI done — mic ON
      setPhaseSafe('listening');
      listenStartRef.current = Date.now();
      lastSpeechTimeRef.current = null;
      startRecognition();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak]);

  const saveAnswerAndNext = useCallback(() => {
    const qs = questionsRef.current;
    const idx = qIndexRef.current;
    answersRef.current.push({
      question: qs[idx],
      answer: transcriptRef.current.trim(),
    });
    askQuestion(idx + 1);
  }, [askQuestion]);

  const finishInterview = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopEverything();
    setPhaseSafe('idle');
    setPage('submitting');
    speak('That concludes your interview. Thank you. Your responses are now being evaluated.');
    try {
      await api.submitInterview(token, answersRef.current);
      setPage('done');
    } catch (err) {
      setError(err.message || 'Failed to submit your interview. Please contact the recruiter.');
      setPage('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, speak]);

  // ── Silence watchdog ───────────────────────────────────────────────────
  useEffect(() => {
    if (page !== 'interview') return;

    watchdogRef.current = setInterval(() => {
      if (phaseRef.current !== 'listening') return;
      const now = Date.now();
      const sinceListen = now - (listenStartRef.current || now);
      const hasSpoken = !!transcriptRef.current.trim();
      const sinceSpeech = lastSpeechTimeRef.current ? now - lastSpeechTimeRef.current : null;

      // Hard cap on answer length
      if (sinceListen > MAX_ANSWER_MS) {
        saveAnswerAndNext();
        return;
      }

      if (hasSpoken) {
        // Candidate answered, then went quiet → answer complete
        if (sinceSpeech !== null && sinceSpeech > SILENCE_ANSWER_DONE) {
          saveAnswerAndNext();
        }
        return;
      }

      // No speech yet
      if (!promptedRef.current && sinceListen > SILENCE_NO_SPEECH) {
        promptedRef.current = true;
        setStatusMsg('Are you there?');
        stopRecognition();
        setPhaseSafe('speaking');
        speak('Are you there? Please answer the question, or it will be skipped.', () => {
          setPhaseSafe('listening');
          listenStartRef.current = Date.now();
          startRecognition();
        });
        return;
      }

      if (promptedRef.current && sinceListen > SILENCE_AFTER_PROMPT) {
        setStatusMsg('No response — moving on.');
        saveAnswerAndNext();
      }
    }, 1000);

    return () => {
      if (watchdogRef.current) { clearInterval(watchdogRef.current); watchdogRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, saveAnswerAndNext, speak]);

  // ── Start interview ────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!SpeechRecognition) {
      setError('Your browser does not support voice recognition. Please use Google Chrome or Microsoft Edge.');
      setPage('error');
      return;
    }
    setPreparing(true);
    try {
      // Request mic permission upfront
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // Warm up voices (some browsers load them lazily)
      window.speechSynthesis.getVoices();

      const res = await api.getInterviewQuestions(token);
      questionsRef.current = res.questions;
      setQuestions(res.questions);
      answersRef.current = [];
      finishedRef.current = false;
      setPage('interview');

      speak(
        `Hello ${info.candidateName}. Welcome to your AI interview for the position of ${info.positionName}. ` +
        `You will be asked ${res.questions.length} questions. Speak your answer after each question. ` +
        `When you finish speaking, pause, and we will move to the next question. Good luck!`,
        () => askQuestion(0)
      );
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access is required for the interview. Please allow it and reload the page.');
      } else {
        setError(err.message || 'Failed to start the interview.');
      }
      setPage('error');
    } finally {
      setPreparing(false);
    }
  };

  // Manual skip / done button
  const handleDoneAnswering = () => {
    if (phaseRef.current === 'listening') saveAnswerAndNext();
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const Background = () => (
    <div className="iv-bg" aria-hidden="true">
      <div className="iv-bg-orb iv-bg-orb-1" />
      <div className="iv-bg-orb iv-bg-orb-2" />
      <div className="iv-bg-orb iv-bg-orb-3" />
      <div className="iv-bg-grid" />
    </div>
  );

  const Brand = () => (
    <div className="iv-brand">
      <div className="iv-brand-mark">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      </div>
      RecEasy
    </div>
  );

  if (page === 'loading') {
    return (
      <div className="iv-page">
        <Background />
        <div className="iv-center">
          <div className="iv-orb iv-orb-sm iv-orb-idle"><div className="iv-orb-core" /></div>
          <p className="iv-loading-text">Validating your interview link<span className="iv-dots"><span>.</span><span>.</span><span>.</span></span></p>
        </div>
      </div>
    );
  }

  if (page === 'error') {
    return (
      <div className="iv-page">
        <Background />
        <div className="iv-card iv-center-card iv-pop-in">
          <div className="iv-icon-circle iv-icon-error">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </div>
          <h2>Interview Unavailable</h2>
          <p>{error}</p>
        </div>
        <div className="iv-footer">Powered by <strong>RecEasy</strong> AI Interviews</div>
      </div>
    );
  }

  if (page === 'intro') {
    return (
      <div className="iv-page">
        <Background />
        <div className="iv-card iv-intro-card iv-pop-in">
          <Brand />

          <div className="iv-orb iv-orb-md iv-orb-idle">
            <div className="iv-orb-ring" />
            <div className="iv-orb-core" />
          </div>

          <div className="iv-intro-eyebrow">AI Voice Interview</div>
          <h1 className="iv-intro-title">
            Hello, {info.candidateName.split(' ')[0]} 👋
          </h1>
          <p className="iv-intro-sub">
            You've been shortlisted for an AI-conducted voice interview. Find a quiet spot,
            take a breath — and just talk naturally.
          </p>

          <div className="iv-job-chips">
            <span className="iv-job-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              {info.positionName}
            </span>
            {info.companyName && (
              <span className="iv-job-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
                {info.companyName}
              </span>
            )}
            <span className="iv-job-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              ~15 minutes
            </span>
            {info.expiresAt && expiryCountdown && (
              <span className="iv-job-chip iv-job-chip--deadline">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2h4M12 2v6M12 22a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"/></svg>
                Link expires in {expiryCountdown}
              </span>
            )}
          </div>

          <div className="iv-steps">
            <div className="iv-step">
              <div className="iv-step-icon">🔊</div>
              <div className="iv-step-text">
                <strong>The AI speaks each question</strong>
                <span>{info.totalQuestions} questions total — wait for it to finish</span>
              </div>
            </div>
            <div className="iv-step">
              <div className="iv-step-icon">🎤</div>
              <div className="iv-step-text">
                <strong>Answer with your voice</strong>
                <span>Your words are transcribed live on screen</span>
              </div>
            </div>
            <div className="iv-step">
              <div className="iv-step-icon">⏸️</div>
              <div className="iv-step-text">
                <strong>Pause ~4 seconds when done</strong>
                <span>The interview moves to the next question automatically</span>
              </div>
            </div>
            <div className="iv-step">
              <div className="iv-step-icon">⚡</div>
              <div className="iv-step-text">
                <strong>One attempt only</strong>
                <span>Use Chrome or Edge — don't refresh mid-interview</span>
              </div>
            </div>
          </div>

          <button className="iv-btn-start" onClick={handleStart} disabled={preparing}>
            {preparing
              ? <><span className="iv-btn-spinner" /> Preparing your questions…</>
              : <>Start Interview
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </>}
          </button>
          <p className="iv-mic-note">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>
            Your browser will ask for microphone access
          </p>
        </div>
        <div className="iv-footer">Powered by <strong>RecEasy</strong> AI Interviews</div>
      </div>
    );
  }

  if (page === 'submitting') {
    return (
      <div className="iv-page">
        <Background />
        <div className="iv-card iv-center-card iv-pop-in">
          <div className="iv-orb iv-orb-md iv-orb-thinking">
            <div className="iv-orb-ring" />
            <div className="iv-orb-core" />
          </div>
          <h2>Evaluating your interview…</h2>
          <p>Our AI is carefully reviewing each of your answers. This takes a few seconds — please keep this page open.</p>
          <div className="iv-eval-steps">
            <span className="iv-eval-step">Transcribing ✓</span>
            <span className="iv-eval-step iv-eval-active">Analyzing answers<span className="iv-dots"><span>.</span><span>.</span><span>.</span></span></span>
          </div>
        </div>
        <div className="iv-footer">Powered by <strong>RecEasy</strong> AI Interviews</div>
      </div>
    );
  }

  if (page === 'done') {
    return (
      <div className="iv-page">
        <Background />
        <div className="iv-card iv-center-card iv-pop-in">
          <div className="iv-icon-circle iv-icon-success">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path className="iv-check-path" d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2>Interview Complete!</h2>
          <p>
            Great job, <strong>{info.candidateName.split(' ')[0]}</strong>. Your interview for{' '}
            <strong>{info.positionName}</strong> has been submitted and evaluated.
          </p>
          <p className="iv-done-sub">You'll receive an email about next steps shortly. You may now close this page.</p>
        </div>
        <div className="iv-footer">Powered by <strong>RecEasy</strong> AI Interviews</div>
      </div>
    );
  }

  // page === 'interview'
  const isSpeaking = phase === 'speaking';
  const isListening = phase === 'listening';

  return (
    <div className="iv-page iv-page-live">
      <Background />

      {/* Top bar */}
      <header className="iv-topbar">
        <Brand />
        <span className="iv-topbar-position">{info.positionName}</span>
        <span className="iv-topbar-counter">{qIndex + 1} <em>/ {questions.length}</em></span>
      </header>

      <main className="iv-stage">

        {/* Segmented progress */}
        <div className="iv-segments">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`iv-segment${i < qIndex ? ' done' : ''}${i === qIndex ? ' current' : ''}`}
            />
          ))}
        </div>

        {/* AI orb */}
        <div className={`iv-orb iv-orb-lg ${isSpeaking ? 'iv-orb-speaking' : isListening ? 'iv-orb-listening' : 'iv-orb-idle'}`}>
          <div className="iv-orb-ring" />
          <div className="iv-orb-core" />
          {isSpeaking && (
            <div className="iv-sound-bars">
              <span /><span /><span /><span /><span />
            </div>
          )}
          {isListening && (
            <svg className="iv-mic-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>
            </svg>
          )}
        </div>

        {/* Status chip */}
        <div className={`iv-status-chip ${isSpeaking ? 'speaking' : 'listening'}`}>
          <span className="iv-status-dot" />
          {isSpeaking ? 'AI is speaking — microphone off' : 'Listening — speak your answer'}
        </div>

        {statusMsg && <div className="iv-status-msg">{statusMsg}</div>}

        {/* Question card — keyed so it re-animates per question */}
        <div className="iv-question-card" key={qIndex}>
          <div className="iv-question-eyebrow">Question {qIndex + 1}</div>
          <div className="iv-question-text">{questions[qIndex]}</div>
        </div>

        {/* Live transcript — editable during listening */}
        <div className={`iv-transcript${liveTranscript ? ' has-text' : ''}${isListening ? ' listening' : ''}`}>
          <div className="iv-transcript-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 22a1 1 0 0 1-1-1v-3H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6.1l-3.7 3.71c-.2.19-.45.29-.7.29H9z"/></svg>
            Your answer
            {isListening && <span className="iv-transcript-edit-hint">· tap to edit</span>}
          </div>
          {isListening ? (
            <textarea
              className="iv-transcript-textarea"
              value={liveTranscript}
              placeholder="Start speaking — your words appear here. You can also type or edit."
              onChange={(e) => {
                const val = e.target.value;
                transcriptRef.current = val;
                lastSpeechTimeRef.current = Date.now();
                isEditingRef.current = true;
                setLiveTranscript(val);
              }}
              onBlur={() => {
                isEditingRef.current = false;
                if (liveTranscript.trim()) lastSpeechTimeRef.current = Date.now();
              }}
            />
          ) : (
            <div className="iv-transcript-text">
              {liveTranscript
                ? liveTranscript
                : <span className="iv-transcript-placeholder">Waiting for the question to finish…</span>}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="iv-controls">
          {isListening && (
            <button className={`iv-btn-next${liveTranscript ? ' primary' : ''}`} onClick={handleDoneAnswering}>
              {liveTranscript
                ? <>Done — Next Question
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </>
                : 'Skip this question'}
            </button>
          )}
        </div>
      </main>

      <div className="iv-footer">Powered by <strong>RecEasy</strong> AI Interviews</div>
    </div>
  );
}
