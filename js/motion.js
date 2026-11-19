// js/motion.js- all the GSAP animation. Every motion is its own function.

// 1. Safety checks and risk managment 
// Animate only if GSAP loaded AND the person has not asked for less motion.
const mReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mCanAnimate = typeof gsap !== "undefined" && !mReduceMotion;

// Tell GSAP about each plugin, but only if it loaded.
if (mCanAnimate) {
  if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);
  if (typeof MotionPathPlugin !== "undefined") gsap.registerPlugin(MotionPathPlugin);
  if (typeof SplitText !== "undefined") gsap.registerPlugin(SplitText);
  if (typeof ScrambleTextPlugin !== "undefined") gsap.registerPlugin(ScrambleTextPlugin);
}

// 2. Motion 1: Hero fish intro (Home) 
// Each fish swims along a curved path from the left edge to its resting spot.
// Plays once per visit. Any key press or click skips it.
// Edit -  change 2.2 (swim time) or 0.1 (gap between fish).
function mHeroIntro() {
  const hero = document.querySelector(".hero");
  if (!hero) return;   // not the Home page

  // Only play once per session
  try {
    if (sessionStorage.getItem("luckyfish.heroPlayed") === "yes") return;
    sessionStorage.setItem("luckyfish.heroPlayed", "yes");
  } catch (error) {
    // storage blocked: just play it
  }

  // Only the fish that are showing 
  const fish = Array.from(hero.querySelectorAll(".hero-fish")).filter(function (f) {
    return f.offsetParent !== null;
  });
  const heading = hero.querySelector("h1");
  const width = hero.offsetWidth;
  const tl = gsap.timeline();

  if (typeof MotionPathPlugin === "undefined") {
    // Backup
    tl.from(fish, { opacity: 0, duration: 0.8, stagger: 0.1 });
  } else {
    fish.forEach(function (f, i) {
      
      // {x: 0, y: 0} is the resting spot. 
      const path = [
        { x: -width, y: -100 + i * 30 },
        { x: -width * 0.6, y: 90 - i * 20 },
        { x: -width * 0.3, y: -70 + i * 25 },
        { x: -60, y: 0 },
        { x: 0, y: 0 }
      ];
      gsap.set(f, { x: path[0].x, y: path[0].y });   // park the fish at the start
      tl.to(f, {
        motionPath: { path: path, curviness: 1.5, autoRotate: true },   // autoRotate faces the fish the way it swims
        duration: 2.2,
        ease: "power2.out",   // slows down as it arrives
        onComplete: function () {
          gsap.to(f, { rotation: 0, duration: 0.3 });   // straighten up
        }
      }, i * 0.2);
    });
  }

  // Headline words rise in, then the tagline fades in
  if (typeof SplitText !== "undefined") {
    const split = new SplitText(heading, { type: "words" });
    tl.from(split.words, { y: 20, opacity: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" }, "-=0.3");
  } else {
    tl.from(heading, { opacity: 0, duration: 0.4 }, "-=0.3");
  }
  tl.from(".hero-tagline", { opacity: 0, y: 10, duration: 0.4 }, "-=0.2");

  // Skip = any key or click jumps to the finished state. It never blocks clicks.
  function skipIntro() {
    tl.progress(1);
    gsap.set(fish, { rotation: 0 });
    stopListening();
  }
  function stopListening() {
    document.removeEventListener("keydown", skipIntro);
    document.removeEventListener("click", skipIntro);
  }
  document.addEventListener("keydown", skipIntro);
  document.addEventListener("click", skipIntro);
  tl.eventCallback("onComplete", stopListening);
}

//3. Motion 2: Button press 

const M_PRESS_SELECTOR = ".btn, .heart-btn, .chip, .shelf-btn, .icon-btn";
let mPressedButton = null;

// mPress
function mPress(button) {
  mPressedButton = button;
  gsap.to(button, { scale: 0.95, duration: 0.1, overwrite: "auto" });
}

// mRelease: spring back
function mRelease() {
  if (!mPressedButton) return;
  gsap.to(mPressedButton, { scale: 1, duration: 0.3, ease: "back.out(3)", overwrite: "auto" });
  mPressedButton = null;
}

function mButtonPress() {
  document.addEventListener("pointerdown", function (event) {
    const button = event.target.closest(M_PRESS_SELECTOR);
    if (button && !button.disabled) mPress(button);
  });
  document.addEventListener("pointerup", mRelease);
  document.addEventListener("pointercancel", mRelease);

  // Keyboard
  document.addEventListener("keydown", function (event) {
    if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
      const button = event.target.closest(M_PRESS_SELECTOR);
      if (button && !button.disabled) mPress(button);
    }
  });
  document.addEventListener("keyup", mRelease);
}

//4. Motion 3: Discount tag sway 

function mSway(tag) {
  gsap.fromTo(tag, { rotation: 18 }, { rotation: 0, duration: 2, ease: "elastic.out(1, 0.2)", overwrite: "auto" });
}

// mTagHover: sway on mouse hover or keyboard focus.
function mTagHover() {
  document.addEventListener("mouseover", function (event) {
    const card = event.target.closest(".game-card");
    if (!card || card.contains(event.relatedTarget)) return;   // ignore moves inside the same card
    mSway(card.querySelector(".discount-tag"));
  });
  document.addEventListener("focusin", function (event) {
    const card = event.target.closest(".game-card");
    if (card) mSway(card.querySelector(".discount-tag"));
  });
}

// setupCardMotion

function setupCardMotion() {
  if (!mCanAnimate || typeof ScrollTrigger === "undefined") return;
  if (window.matchMedia("(hover: none)").matches) {
    document.querySelectorAll(".discount-tag").forEach(function (tag) {
      if (tag.dataset.swayReady) return;   // already set up
      tag.dataset.swayReady = "yes";
      ScrollTrigger.create({
        trigger: tag,
        start: "top 90%",
        once: true,
        onEnter: function () { mSway(tag); }
      });
    });
  }
  ScrollTrigger.refresh();
}

// 5. Motion 4: Heart beat

function mHeartBeat() {
  document.addEventListener("click", function (event) {
    const heart = event.target.closest(".heart-btn[data-gameid]");
    if (!heart) return;
    if (heart.getAttribute("aria-pressed") !== "true") return;
    // up, down, up, down = two beats
    gsap.fromTo(heart, { scale: 1 }, { scale: 1.3, duration: 0.2, repeat: 3, yoyo: true, ease: "power2.out", overwrite: "auto" });
  });
}

//  5b. Motion 5: Parallax fish - on the about page 

function mParallax() {
  if (typeof ScrollTrigger === "undefined") return;
  document.querySelectorAll(".about-fish").forEach(function (fish) {
    if (fish.offsetParent === null) return;   // hidden on phones
    gsap.to(fish, {
        y: -Number(fish.dataset.speed) * 3,
      ease: "none",
      scrollTrigger: { trigger: fish.parentElement, start: "top bottom", end: "bottom top", scrub: true }
    });
  });
}

// 6. Motion 6: Heading effects 

function mHeadings() {
  const h1 = document.querySelector("h1");
  const skipH1 = document.querySelector(".hero") || document.querySelector("#game-title") || document.querySelector(".about-title");

  if (h1 && !skipH1 && typeof SplitText !== "undefined") {
    const split = new SplitText(h1, { type: "words" });
    gsap.from(split.words, { y: 20, opacity: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" });
  }

  if (typeof ScrollTrigger === "undefined") return;
  document.querySelectorAll("h2").forEach(function (h2) {
    if (h2.classList.contains("label-pill")) {
      // Typing effect. Edit: 0.2 = seconds per letter (bigger = slower).
      const finalText = h2.textContent;
      h2.setAttribute("aria-label", finalText);
      h2.style.minWidth = h2.offsetWidth + "px";   // keeps the pill the same size while typing
      h2.textContent = "";
      const typer = { count: 0 };
      ScrollTrigger.create({
        trigger: h2, start: "top 90%", once: true,
        onEnter: function () {
          gsap.to(typer, {
            count: finalText.length,
            duration: finalText.length * 0.2,
            ease: "none",
            onUpdate: function () {
              h2.textContent = finalText.slice(0, Math.round(typer.count));
            }
          });
        }
      });
    } else if (typeof SplitText !== "undefined") {
      const split = new SplitText(h2, { type: "words" });
      gsap.from(split.words, {
        y: 20, opacity: 0, duration: 0.4, stagger: 0.06, ease: "power2.out",
        scrollTrigger: { trigger: h2, start: "top 90%", once: true }
      });
    }
  });
}

// 7. Start everything 
// so each motion is in its own try/catch, so if one breaks the others still work.

if (mCanAnimate) {
  [mHeroIntro, mButtonPress, mTagHover, mHeartBeat, mParallax, mHeadings].forEach(function (motion) {
    try {
      motion();
    } catch (error) {
      console.log("Motion failed:", motion.name, error);
    }
  });


  window.addEventListener("load", function () {
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  });
}