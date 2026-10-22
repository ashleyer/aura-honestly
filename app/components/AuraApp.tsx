"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prepareImage } from "@/lib/palette";
import type { Reading } from "@/lib/schema";

type Phase = "idle" | "preparing" | "reading" | "done" | "error";

const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "";
const BENCHMARK_URL = process.env.NEXT_PUBLIC_BENCHMARK_URL || "";

function Orb({ colors, active }: { colors: string[]; active: boolean }) {
  const [a, b, c] = [colors[0] ?? "#6b7fa8", colors[1] ?? colors[0] ?? "#c9a36b", colors[2] ?? colors[0] ?? "#2f3a56"];
  return (
    <div className={`orb ${active ? "orb--active" : ""}`} aria-hidden="true">
      <span style={{ background: `radial-gradient(circle at 50% 50%, ${a}, transparent 62%)` }} />
      <span style={{ background: `radial-gradient(circle at 50% 50%, ${b}, transparent 60%)` }} />
      <span style={{ background: `radial-gradient(circle at 50% 50%, ${c}, transparent 58%)` }} />
    </div>
  );
}

export default function AuraApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ dataUrl: string; palette: string[] } | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "done") resultRef.current?.focus();
  }, [phase]);

  const onFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setPhase("preparing");
    try {
      setImage(await prepareImage(file));
      setPhase("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That image couldn't be read.");
      setPhase("error");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!image && !text.trim()) {
      setError("Share a photo or a few words first.");
      setPhase("error");
      return;
    }
    setError("");
    setPhase("reading");
    try {
      const res = await fetch("/api/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, imageDataUrl: image?.dataUrl, palette: image?.palette ?? [] }),
      });
      // The firewall's rate limit answers before this app does, with a non-JSON body,
      // so a 429 is handled before parsing rather than surfacing a JSON syntax error.
      if (res.status === 429) throw new Error("Too many readings in a row. Give it a minute and try again.");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setReading(data as Reading);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("error");
    }
  }

  function reset() {
    setReading(null);
    setImage(null);
    setText("");
    setError("");
    setCopied(false);
    setPhase("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function copy() {
    if (!reading) return;
    const body = `${reading.auraName}\n\n${reading.reading}\n\n${reading.question}\n\nReflection, not perception. Aura, Honestly.`;
    await navigator.clipboard.writeText(body);
    setCopied(true);
  }

  const orbColors = reading?.colors ?? image?.palette ?? [];
  const busy = phase === "preparing" || phase === "reading";

  return (
    <div className="shell">
      <header className="top">
        <span className="wordmark">Aura, Honestly</span>
        <span className="chip">reflection, not perception</span>
      </header>

      <main>
        <Orb colors={orbColors} active={phase === "reading"} />

        {phase !== "done" || !reading ? (
          <section className="intro">
            <h1>Show me something you chose.</h1>
            <p className="lede">
              An outfit, your desk, the sky outside, the last thing you cooked. I&apos;ll read the colors and details you
              point me at. I can&apos;t see your energy. Nobody can. What I can do is pay attention.
            </p>

            <form onSubmit={submit} className="card">
              <label className={`drop ${image ? "drop--filled" : ""}`}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => onFile(e.target.files?.[0])}
                  disabled={busy}
                />
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.dataUrl} alt="Your chosen photo" />
                ) : (
                  <span>
                    <strong>Add a photo</strong>
                    <small>No faces, please. I read what&apos;s around you, never who you are.</small>
                  </span>
                )}
              </label>

              {image && image.palette.length > 0 && (
                <div className="measured">
                  <span className="mono">measured from your pixels</span>
                  <ul className="swatches">
                    {image.palette.map((hex) => (
                      <li key={hex} style={{ background: hex }} title={hex}>
                        <span className="sr-only">{hex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="field">
                <span>A few words about today (optional)</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1200}
                  rows={3}
                  placeholder="Rained all morning. Finally fixed the bike. Oddly proud of it."
                  disabled={busy}
                />
              </label>

              <button type="submit" disabled={busy}>
                {phase === "preparing" ? "Measuring colors" : phase === "reading" ? "Reading" : "Read it"}
              </button>
              {phase === "error" && error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </section>
        ) : (
          <article className="result" ref={resultRef} tabIndex={-1} aria-live="polite">
            <p className="mono eyebrow">your aura, honestly</p>
            <h2>{reading.auraName}</h2>
            <p className="reading">{reading.reading}</p>

            {reading.decisionNote && (
              <aside className="note">
                <strong>An aura can&apos;t answer this one.</strong> {reading.decisionNote}
              </aside>
            )}

            {reading.holdNote && (
              <aside className="note">
                <strong>Held steady.</strong> {reading.holdNote}
              </aside>
            )}

            {reading.question && <p className="question">{reading.question}</p>}

            <section className="receipt mono" aria-label="What this reading was built from">
              <p className="receipt-title">RECEIPT</p>
              <p>WHAT I USED</p>
              <ul>
                {reading.cues.length ? reading.cues.map((c) => <li key={c}>{c}</li>) : <li>what you shared</li>}
              </ul>
              <p>COLORS</p>
              <ul className="receipt-colors">
                {reading.colors.map((hex) => (
                  <li key={hex}>
                    <i style={{ background: hex }} /> {hex}
                  </li>
                ))}
              </ul>
              <p>READER</p>
              <ul>
                <li>{reading.provider ?? reading.mode}</li>
              </ul>
              <p>WHAT I DIDN&apos;T DO</p>
              <ul>
                <li>sense your energy (can&apos;t)</li>
                <li>read your face or body</li>
                <li>agree because you asked</li>
                <li>keep your photo or words</li>
              </ul>
            </section>

            <div className="actions">
              <button onClick={copy}>{copied ? "Copied" : "Copy reading"}</button>
              <button className="ghost" onClick={reset}>
                Read something else
              </button>
            </div>
          </article>
        )}
      </main>

      <footer className="foot">
        <p>
          Built on a benchmark that tested how AI models behave when asked to read auras.
          {BENCHMARK_URL && (
            <>
              {" "}
              <a href={BENCHMARK_URL}>See the results.</a>
            </>
          )}
          {REPO_URL && (
            <>
              {" "}
              <a href={REPO_URL}>Open source.</a>
            </>
          )}
        </p>
      </footer>
    </div>
  );
}
