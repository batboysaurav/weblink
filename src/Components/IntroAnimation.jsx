import { useEffect, useMemo, useState } from "react";
import "./IntroAnimation.css";

const STORAGE_KEY = "100rab_intro_seen";
const LEAVE_AT = 2900;  // start exit transition (ms)
const END_AT = 3600;    // unmount overlay (ms)

function shouldPlay() {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return sessionStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return false; // never block the site if storage/matchMedia fails
  }
}

export default function IntroAnimation({ onDone }) {
  const [visible, setVisible] = useState(shouldPlay);
  const [leaving, setLeaving] = useState(false);

  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${(i * 37 + 11) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        size: 1 + (i % 3),
        delay: (i % 6) * 0.12,
        dur: 2.2 + (i % 4) * 0.4,
      })),
    []
  );

  useEffect(() => {
    if (!visible) {
      onDone?.();
      return;
    }
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t1 = setTimeout(() => setLeaving(true), LEAVE_AT);
    const t2 = setTimeout(() => setVisible(false), END_AT);
    const onKey = (e) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function skip() {
    setLeaving(true);
    setTimeout(() => setVisible(false), 350);
  }

  if (!visible) return null;

  return (
    <div
      className={`intro ${leaving ? "intro--leave" : ""}`}
      role="dialog"
      aria-label="100RAB intro"
    >
      <div className="intro__grain" aria-hidden="true" />
      <div className="intro__glow" aria-hidden="true" />
      <div className="intro__streak" aria-hidden="true" />

      <div className="intro__particles" aria-hidden="true">
        {particles.map((p, i) => (
          <span
            key={i}
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          />
        ))}
      </div>

      <div className="intro__stage">
        <div className="intro__mark" aria-hidden="true">
          <span>1</span>
        </div>

        <div className="intro__word" aria-label="100RAB">
          {"100RAB".split("").map((ch, i) => (
            <span key={i} className="intro__letter" style={{ "--i": i }} aria-hidden="true">
              {ch}
            </span>
          ))}
          <i className="intro__shine" aria-hidden="true" />
        </div>

        <p className="intro__tagline">YOUR NEXT OBSESSION STARTS HERE</p>
      </div>

      <button type="button" className="intro__skip" onClick={skip} autoFocus>
        Skip intro
      </button>
    </div>
  );
}