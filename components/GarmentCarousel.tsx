"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import type { Garment } from "@/lib/garments";

interface Props {
  garments: Garment[];
  activeId: string;
  applyingId: string | null;
  onSelect: (garment: Garment) => void;
}

/** How long scrolling must stop before the centred garment counts as picked. */
const SETTLE_MS = 180;
/** Slides further than this (in slide widths) from the centre are drawn like the ones at this distance. */
const MAX_DISTANCE = 3;
/** Slides wanted on each side of the middle copy, so the edges never show empty space. */
const HEADROOM = 7;

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.2" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path
        d={direction === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * An endless snap-scrolling "cover flow" of garments. The list is rendered several
 * times in a row and, once a swipe settles, the view jumps back to the middle copy
 * (the copies are identical, so the jump is invisible). The slide in the middle is
 * the picked one: swiping, tapping, the arrow buttons or the arrow keys all change
 * it, and the live try-on follows.
 */
export default function GarmentCarousel({ garments, activeId, applyingId, onSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const frameRef = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeRef = useRef(activeId);
  const listKeyRef = useRef("");
  // The garment this component just picked itself (by swipe, tap or arrow), so it isn't re-centred.
  const pickedRef = useRef<string | null>(null);

  const count = garments.length;
  const copies = count >= HEADROOM ? 3 : 2 * Math.ceil(HEADROOM / Math.max(count, 1)) + 1;
  const total = copies * count;
  /** Index of the first slide of the middle copy. */
  const base = ((copies - 1) / 2) * count;
  const activeIndex = garments.findIndex((g) => g.id === activeId);
  const listKey = garments.map((g) => g.id).join(",");

  const nearestSlide = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return -1;
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let nearest = -1;
    let nearestDistance = Infinity;
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
      if (distance < nearestDistance) {
        nearest = i;
        nearestDistance = distance;
      }
    });
    return nearest;
  }, []);

  // Drives the 3D look: each slide gets its signed distance from the centre as CSS variables.
  const layoutSlides = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let nearest = -1;
    let nearestDistance = Infinity;
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const raw = (slide.offsetLeft + slide.offsetWidth / 2 - center) / (slide.offsetWidth * 1.08);
      const d = Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, raw));
      slide.style.setProperty("--d", d.toFixed(3));
      slide.style.setProperty("--abs", Math.abs(d).toFixed(3));
      if (Math.abs(raw) < nearestDistance) {
        nearest = i;
        nearestDistance = Math.abs(raw);
      }
    });
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const value = i === nearest ? "true" : "false";
      if (slide.dataset.center !== value) slide.dataset.center = value;
    });
  }, []);

  const centerOn = useCallback((index: number, smooth: boolean) => {
    const scroller = scrollerRef.current;
    const slide = slideRefs.current[index];
    if (!scroller || !slide) return;
    const target = slide.offsetLeft + slide.offsetWidth / 2 - scroller.clientWidth / 2;
    if (Math.abs(target - scroller.scrollLeft) < 1) return;
    scroller.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  // Keep the picked garment centred in the middle copy. Our own picks already scroll themselves.
  useEffect(() => {
    const sameList = listKeyRef.current === listKey;
    listKeyRef.current = listKey;
    const ownPick = pickedRef.current === activeId;
    pickedRef.current = null;
    if (activeIndex >= 0 && (!sameList || !ownPick)) centerOn(base + activeIndex, sameList);
    layoutSlides();
  }, [activeIndex, activeId, listKey, base, centerOn, layoutSlides]);

  // A filter can remove the picked garment; pick the first one that is left.
  useEffect(() => {
    if (activeIndex < 0 && garments[0]) onSelect(garments[0]);
  }, [activeIndex, garments, onSelect]);

  useEffect(() => {
    const onResize = () => {
      if (activeIndex >= 0) centerOn(base + activeIndex, false);
      layoutSlides();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex, base, centerOn, layoutSlides]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
      clearTimeout(settleTimer.current);
    };
  }, []);

  const onScroll = () => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(layoutSlides);

    clearTimeout(settleTimer.current);
    // Scrolls we start ourselves always end on the picked slide, so only a swipe can change the pick here.
    settleTimer.current = setTimeout(() => {
      const nearest = nearestSlide();
      if (nearest < 0 || count === 0) return;
      const garment = garments[nearest % count];
      if (garment.id !== activeRef.current) {
        pickedRef.current = garment.id;
        onSelect(garment);
      }
      // The copies are identical: hop back to the middle one, unseen, so the loop never runs out.
      if (nearest < base || nearest >= base + count) centerOn(base + (nearest % count), false);
    }, SETTLE_MS);
  };

  const pick = (slideIndex: number) => {
    const garment = garments[slideIndex % count];
    if (!garment) return;
    centerOn(slideIndex, true);
    if (garment.id !== activeId) {
      pickedRef.current = garment.id;
      onSelect(garment);
    }
  };

  const step = (delta: number) => {
    const from = nearestSlide();
    const origin = from >= 0 ? from : base + Math.max(activeIndex, 0);
    pick(Math.max(0, Math.min(total - 1, origin + delta)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(event.key === "ArrowLeft" ? -1 : 1);
    }
  };

  return (
    <div className="carousel">
      <button className="nav nav-prev" onClick={() => step(-1)} aria-label="Previous garment">
        <Chevron direction="left" />
      </button>

      <div
        ref={scrollerRef}
        className="carousel-track"
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Garments. Swipe or use the arrow keys to change outfit."
      >
        {Array.from({ length: total }, (_, slideIndex) => {
          const garment = garments[slideIndex % count];
          const active = garment.id === activeId;
          const busy = garment.id === applyingId;
          const spare = slideIndex < base || slideIndex >= base + count;
          return (
            <button
              key={slideIndex}
              ref={(el) => {
                slideRefs.current[slideIndex] = el;
              }}
              className="slide"
              onClick={() => pick(slideIndex)}
              aria-pressed={active}
              aria-label={`${garment.name}, ${garment.type}`}
              aria-hidden={spare || undefined}
              tabIndex={-1}
            >
              {/* The tilt lives on the inner card: snapping measures the button, so it must not change shape. */}
              <span className="slide-card">
                <span className="slide-img">
                  <Image
                    src={garment.image}
                    alt=""
                    fill
                    sizes="(max-width: 900px) 30vw, 120px"
                    style={{ objectFit: "contain" }}
                  />
                  {active && !busy && (
                    <span className="slide-check">
                      <CheckIcon />
                    </span>
                  )}
                  {busy && (
                    <span className="slide-busy">
                      <span className="spinner spinner-sm" />
                    </span>
                  )}
                </span>
                <span className="slide-name">{garment.name}</span>
                <span className="slide-type">{garment.type}</span>
              </span>
            </button>
          );
        })}
      </div>

      <button className="nav nav-next" onClick={() => step(1)} aria-label="Next garment">
        <Chevron direction="right" />
      </button>

      <div className="dots" aria-hidden>
        {garments.map((garment, index) => (
          <span key={garment.id} className={`dot${index === activeIndex ? " dot-active" : ""}`} />
        ))}
      </div>
    </div>
  );
}
