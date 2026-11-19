import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { LEVEL_NAMES, chooseLevel, nextLevel, pickQuality } from './quality';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { setAnisotropy } from './util';
import { buildWorld, type View, type World } from './world';
import { audioState, audioTime, isMuted, measureLoop, setInside, setMuted, setTempo, startAudio, tempoOf } from './audio';
import { applyCopy } from './copy';
import { EYE } from './nav';
import type { VenueModule } from './types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

/** Post passes sample the composer colour buffer; MSAA on that target often leaves unresolved black pixels once bloom runs (common on WebGL2). */
function postProcessMsaa(_renderer: THREE.WebGLRenderer, want: number) {
  return 0;
}

const GrainShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: 0.045 }, vignette: { value: 1.0 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float time; uniform float amount; uniform float vignette; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      // a whisper of chromatic aberration at the edges, like a phone camera at 4am
      float ca = dot(d, d) * 0.006;
      vec4 c;
      c.r = texture2D(tDiffuse, vUv + d * ca).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv - d * ca).b;
      c.a = 1.0;
      float n = hash(vUv * 1000.0) - 0.5;
      c.rgb += n * amount;
      c.rgb *= 1.0 - dot(d, d) * 0.9 * vignette;
      gl_FragColor = c;
    }`,
};

/** Build a venue and run it in the page. */
export async function start(venue: VenueModule) {
  const root = document.documentElement;
  const { plan } = venue;
  applyCopy(plan.copy);
  setTempo(plan.show.bpm);
  const canvas = $<HTMLCanvasElement>('cw-canvas');
  if (!canvas) return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    root.dataset.cwState = 'fallback';
    return;
  }
  const coarse = matchMedia('(pointer: coarse)').matches;
  const quality = pickQuality(renderer);
  root.dataset.cwDetail = quality.level;
  let dpr = Math.min(window.devicePixelRatio, quality.maxPixelRatio);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2500);

  // The whole model is generated on the spot, which takes a moment. The work is
  // cut into stages so the loader can show where it is and the page never looks frozen.
  const loadBar = $('cw-load-bar');
  const loadLabel = $('cw-load-label');
  const loader = $('cw-loader');
  const step = (label: string, progress: number) => {
    if (loadLabel) loadLabel.textContent = label;
    if (loadBar) loadBar.style.transform = `scaleX(${progress})`;
    loader?.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    // two frames so the text and bar are on screen before the next heavy stage; the timeout covers a hidden tab
    return new Promise<void>((resolve) => {
      const t = window.setTimeout(resolve, 120);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.clearTimeout(t);
          resolve();
        }),
      );
    });
  };
  await step('Loading the engine', 0.04);
  const world: World = await buildWorld(scene, renderer, venue, { coarse, quality, step });
  const nav = world.nav;

  // MSAA on the composer colour buffer only when the browser can resolve it for shader passes (see quality.samples).
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: postProcessMsaa(renderer, quality.samples) });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  // Contact shadows where surfaces meet: under benches, behind columns, between people.
  let gtao: GTAOPass | null = null;
  if (quality.ambientOcclusion) {
    gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.blendIntensity = 0.55;
    gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.3, thickness: 1.2, scale: 1.1, samples: 8, distanceFallOff: 1, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grain = new ShaderPass(GrainShader);
  composer.addPass(grain);

  function resize() {
    const w = canvas!.clientWidth || window.innerWidth;
    const h = canvas!.clientHeight || window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 72 : 60;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ----------------------------------------------------------- camera ---- */
  // The camera is a position plus yaw and pitch. Viewpoints fly it; walking
  // moves it on the floor of whatever zone it is in.
  const pos = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0;
  let current: View = world.viewpoints[0];
  let urlReady = false;
  let timeIndex = 0;
  /** The zone the caption on screen was written for. */
  let captionZone = '';
  let flight: { from: THREE.Vector3; to: THREE.Vector3; yaw0: number; yaw1: number; pitch0: number; pitch1: number; t: number; dur: number; via?: THREE.Vector3 } | null = null;

  function aim(target: THREE.Vector3, from: THREE.Vector3) {
    const d = target.clone().sub(from);
    return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
  }

  function place(v: View) {
    pos.copy(v.position);
    const a = aim(v.target, v.position);
    yaw = a.yaw;
    pitch = a.pitch;
  }

  function caption(c: { title: string; text: string } | undefined, view: string | null) {
    document.querySelectorAll<HTMLButtonElement>('[data-cw-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cwView === view)));
    const cap = $('cw-caption');
    if (!cap) return;
    if (c) {
      $('cw-caption-title')!.textContent = c.title;
      $('cw-caption-text')!.textContent = c.text;
    }
    cap.hidden = !c;
  }

  function goTo(v: View, instant = false) {
    current = v;
    writeUrl();
    caption(v, v.id);
    // the viewpoint's own words stay up until the walk leaves the room it stands in
    captionZone = nav.zoneAt(v.position).id;
    if (instant) {
      place(v);
      flight = null;
      return;
    }
    const a = aim(v.target, v.position);
    let yaw1 = a.yaw;
    while (yaw1 - yaw > Math.PI) yaw1 -= Math.PI * 2;
    while (yaw1 - yaw < -Math.PI) yaw1 += Math.PI * 2;
    const dist = pos.distanceTo(v.position);
    // Going between inside and outside, cut rather than fly through a wall.
    const crossing = nav.zoneAt(pos).inside !== nav.zoneAt(v.position).inside;
    if (crossing) {
      flash();
      place(v);
      flight = null;
      return;
    }
    flight = {
      from: pos.clone(),
      to: v.position.clone(),
      yaw0: yaw,
      yaw1,
      pitch0: pitch,
      pitch1: a.pitch,
      t: 0,
      dur: Math.min(4.5, 1.4 + dist / 60),
    };
  }

  function flash() {
    const f = $('cw-fade');
    if (!f) return;
    f.classList.remove('cw-fade-run');
    void f.offsetWidth;
    f.classList.add('cw-fade-run');
  }

  /** Keep the address in step with the view, so it can be shared. */
  function writeUrl() {
    if (!urlReady) return;
    const u = new URL(location.href);
    if (current.id === world.viewpoints[0].id) u.searchParams.delete('view');
    else u.searchParams.set('view', current.id);
    if (timeIndex) u.searchParams.set('time', plan.times[timeIndex].id);
    else u.searchParams.delete('time');
    history.replaceState(null, '', u);
  }

  /* ------------------------------------------------------------ input ---- */
  const firstViewKey = plan.firstViewKey ?? 1;
  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof Element && e.target.closest('input,textarea,select,dialog')) return;
    // Ctrl+L, Cmd+1 and the rest belong to the browser
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() === 'i') {
      $<HTMLDialogElement>('cw-info')?.showModal();
      return;
    }
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q', 'e'].includes(k)) {
      keys.add(k);
      flight = null;
      if (k.startsWith('arrow')) e.preventDefault();
    }
    // a digit and nothing else: Number(' ') is 0, and 0 can be a viewpoint's key
    const view = /^[0-9]$/.test(e.key) ? world.viewpoints[Number(e.key) - firstViewKey] : undefined;
    if (view) {
      begin();
      goTo(view);
    }
    if (k === 'm') toggleMute();
    if (k === 'l') toggleTime();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && joyId !== null) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    begin();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    const s = e.pointerType === 'touch' ? 0.006 : 0.004;
    // the view follows the hand: drag up to look up, drag right to look right
    yaw -= dx * s;
    pitch = THREE.MathUtils.clamp(pitch - dy * s, -1.45, 1.45);
    if (Math.abs(dx) + Math.abs(dy) > 1) flight = null;
  });
  const endDrag = () => (dragging = false);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      flight = null;
      const f = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
      const z = nav.zoneAt(pos);
      const next = pos.clone().addScaledVector(f, -e.deltaY * (z.inside ? 0.01 : 0.06));
      const lad = nav.ladderAt(pos);
      if (lad && pos.y - EYE > lad.bottom + 0.15) return; // hands on the rungs
      // along the ground it is a walk like any other: walls and furniture stop it
      const at = nav.move(pos, next);
      pos.x = at.x;
      pos.z = at.z;
      if (z.inside) {
        const floor = nav.floorAt(pos);
        if (floor !== null) pos.y = floor + EYE;
      } else {
        // out of doors the wheel also climbs and dives, down to whatever is underneath
        pos.y = next.y;
        const floor = nav.floorAt(pos);
        pos.y = Math.max(pos.y, (floor ?? 0) + EYE);
      }
    },
    { passive: false },
  );

  // Touch joystick
  const joy = $('cw-joystick');
  const knob = $('cw-knob');
  let joyId: number | null = null;
  const joyVec = new THREE.Vector2();
  if (joy && knob) {
    joy.addEventListener('pointerdown', (e) => {
      joyId = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      moveJoy(e);
      begin();
      flight = null;
    });
    const moveJoy = (e: PointerEvent) => {
      if (e.pointerId !== joyId) return;
      const r = joy.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      joyVec.set(x, y);
      if (joyVec.length() > 1) joyVec.normalize();
      knob.style.transform = `translate(${joyVec.x * 28}px, ${joyVec.y * 28}px)`;
    };
    joy.addEventListener('pointermove', moveJoy);
    const endJoy = () => {
      joyId = null;
      joyVec.set(0, 0);
      knob.style.transform = '';
    };
    joy.addEventListener('pointerup', endJoy);
    joy.addEventListener('pointercancel', endJoy);
  }

  /* --------------------------------------------------------------- UI ---- */
  const views = $('cw-views');
  if (views) {
    views.replaceChildren(
      ...world.viewpoints.map((v, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.cwView = v.id;
        b.setAttribute('aria-pressed', 'false');
        const num = document.createElement('span');
        num.className = 'cw-num';
        // the key that flies here; a viewpoint past the last digit has none
        const digit = i + firstViewKey;
        if (digit <= 9) num.textContent = String(digit);
        b.append(num, document.createTextNode(v.label));
        b.addEventListener('click', () => {
          begin();
          goTo(v);
        });
        return b;
      }),
    );
  }

  const muteBtn = $<HTMLButtonElement>('cw-mute');
  function toggleMute() {
    setMuted(!isMuted());
    if (muteBtn) {
      muteBtn.setAttribute('aria-pressed', String(isMuted()));
      muteBtn.textContent = isMuted() ? 'Sound off' : 'Sound on';
    }
  }
  muteBtn?.addEventListener('click', () => {
    begin();
    toggleMute();
  });

  const timeBtn = $<HTMLButtonElement>('cw-time');
  function showTime() {
    if (!timeBtn) return;
    timeBtn.setAttribute('aria-pressed', String(timeIndex > 0));
    timeBtn.textContent = plan.times[timeIndex].label;
    timeBtn.hidden = plan.times.length < 2;
  }
  function setTime(index: number, instant = false) {
    timeIndex = index;
    world.setTime(index, instant);
    writeUrl();
    showTime();
  }
  const toggleTime = (instant = false) => setTime((timeIndex + 1) % plan.times.length, instant);
  showTime();
  timeBtn?.addEventListener('click', () => toggleTime());

  let begun = false;
  function begin() {
    if (begun) return;
    begun = true;
    startAudio();
    $('cw-intro')?.setAttribute('hidden', '');
    root.dataset.cwState = 'live';
  }
  $('cw-start')?.addEventListener('click', () => {
    begin();
    goTo(world.viewpoints.find((v) => v.id === plan.startView) ?? world.viewpoints[0]);
  });

  /* ------------------------------------------------------------- loop ---- */
  // A link can open on a viewpoint and a time: ?view=main&time=morning. ui=0 hides the overlay.
  const params = new URLSearchParams(location.search);
  const linked = world.viewpoints.find((v) => v.id === params.get('view'));
  if (params.get('ui') === '0') root.dataset.cwUi = 'off';
  place(world.viewpoints[0]);
  goTo(linked ?? world.viewpoints[0], true);
  if (linked) $('cw-intro')?.setAttribute('hidden', '');
  const linkedTime = plan.times.findIndex((t) => t.id === params.get('time'));
  if (linkedTime > 0) setTime(linkedTime, true);
  urlReady = true;

  await step(plan.copy.loading.warm, 0.88);
  camera.position.copy(pos);
  // Build the shaders for every set of lights now, behind the loader, so stepping through
  // the door or up the stairs later does not freeze the picture. Two things matter here:
  // the scene is drawn into the composer's buffer, not straight to the screen, and shaders
  // differ between the two, so the buffer has to be the target while compiling; and things
  // that happen to be hidden right now (beams, dust) need their shaders as well.
  {
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible && !(o as THREE.Light).isLight) {
        hidden.push(o);
        o.visible = true;
      }
    });
    renderer.setRenderTarget(composer.renderTarget1);
    try {
      for (const sets of world.lightCombos()) {
        world.useLights(sets);
        await renderer.compileAsync(scene, camera);
      }
    } catch (error) {
      // older browsers compile on first draw instead
      console.warn('Shader warm-up skipped', error);
    }
    renderer.setRenderTarget(null);
    // Textures are normally sent to the graphics card the first time something wearing them
    // is drawn, which is a stutter on first entering each room. Send them all now.
    const sent = new Set<THREE.Texture>();
    scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material;
      for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
        for (const value of Object.values(m)) {
          const tex = value as THREE.Texture | null;
          if (tex && tex.isTexture && tex.image && !sent.has(tex)) {
            sent.add(tex);
            renderer.initTexture(tex);
          }
        }
      }
    });
    // Draw one frame from inside each set of rooms as well: that allocates the shadow maps
    // and whatever else the first real frame there would otherwise have to set up.
    const here = pos.clone();
    for (const v of world.viewpoints) {
      camera.position.copy(v.position);
      camera.lookAt(v.target);
      camera.updateMatrixWorld();
      world.update(0, 0, 0, camera, nav.zoneAt(v.position));
      composer.render();
    }
    camera.position.copy(here);
    for (const o of hidden) o.visible = false;
  }

  composer.render();
  await step(plan.copy.loading.open, 1);
  root.dataset.cwState = 'ready';

  /* detail level: shown bottom left, click to step through the three */
  const detailBtn = $<HTMLButtonElement>('cw-detail');
  if (detailBtn) {
    detailBtn.textContent = `Detail: ${LEVEL_NAMES[quality.level]}`;
    detailBtn.title = `${quality.chosen === 'auto' ? 'Chosen for this device. ' : ''}Click for ${LEVEL_NAMES[nextLevel(quality.level)]} (reloads the model)`;
    detailBtn.hidden = false;
    detailBtn.addEventListener('click', () => chooseLevel(nextLevel(quality.level)));
  }

  /* info card */
  const info = $<HTMLDialogElement>('cw-info');
  const infoBtn = $<HTMLButtonElement>('cw-info-open');
  infoBtn?.addEventListener('click', () => info?.showModal());
  $('cw-info-close')?.addEventListener('click', () => info?.close());
  // a click on the backdrop closes it
  info?.addEventListener('click', (e) => {
    if (e.target === info) info.close();
  });

  if (import.meta.env.DEV) {
    // Inspection hook for development only: jump to a viewpoint and time a frame.
    renderer.info.autoReset = false;
    const v3 = (p: number[]) => new THREE.Vector3(p[0], p[1], p[2]);
    (window as unknown as { __club: unknown }).__club = {
      plan,
      /** Walk from a towards b as the keys would; returns where it ends. */
      move: (a: number[], b: number[]) => nav.move(v3(a), v3(b)).toArray(),
      floor: (p: number[]) => nav.floorAt(v3(p)),
      zone: (p?: number[]) => nav.zoneAt(p ? v3(p) : pos).id,
      /** What is heard in every place, as the plan has it. */
      heard: () => nav.zones().map((z) => ({ id: z.id, track: z.track === undefined ? 'techno' : z.track, music: z.music, loudness: z.loudness })),
      /** What the mix is set to now, and a loop measured on its own. */
      audio: audioState,
      measureLoop,
      strobe: (beat: number, bpm?: number) => world.strobeAt(beat, bpm),
      state: () => ({ begun, time: plan.times[timeIndex].id, caption: $('cw-caption')?.hidden ? null : $('cw-caption-title')?.textContent, pressed: document.querySelector<HTMLElement>('[data-cw-view][aria-pressed="true"]')?.dataset.cwView ?? null, intro: !$('cw-intro')?.hasAttribute('hidden') }),
      go: (i: number) => {
        begin();
        goTo(world.viewpoints[i], true);
      },
      pose: (x: number, y: number, z: number, ya: number, pi: number) => {
        begin();
        flight = null;
        pos.set(x, y, z);
        yaw = ya;
        pitch = pi;
      },
      /** Stop or start drawing frames; everything else carries on. For scripted walks, which are slow to draw in software. */
      draw: (on: boolean) => {
        drawing = on;
      },
      /** Switch to a time of day by id, at once. */
      at: (id: string) => setTime(Math.max(0, plan.times.findIndex((t) => t.id === id)), true),
      time: (n = 10) => {
        const t0 = performance.now();
        for (let i = 0; i < n; i++) composer.render();
        // reading a pixel back waits for the GPU, so the time is the real cost of a frame
        const gl = renderer.getContext();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        return (performance.now() - t0) / n;
      },
      hitches: () => hitches.splice(0),
      where: () => [pos.x, pos.y, pos.z, yaw, pitch],
      programs: () => renderer.info.programs?.length ?? 0,
      info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }),
      /** Every image the scene's materials wear, counted once: how many, and megabytes on the graphics card with mipmaps. */
      textureMemory: () => {
        const seen = new Set<unknown>();
        let bytes = 0;
        scene.traverse((o) => {
          const mats = (o as THREE.Mesh).material;
          for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
            for (const value of Object.values(m)) {
              const tex = value as THREE.Texture | null;
              const image = tex && tex.isTexture ? (tex.image as { width?: number; height?: number } | null) : null;
              if (!tex || !image?.width || !image.height || seen.has(tex.source)) continue;
              seen.add(tex.source);
              bytes += image.width * image.height * 4 * (tex.generateMipmaps ? 4 / 3 : 1);
            }
          }
        });
        return { images: seen.size, megabytes: +(bytes / 1048576).toFixed(1) };
      },
      /** The meshes with the most triangles among those switched on, with a hint of what each is. */
      heaviest: (n = 12) => {
        const rows: { triangles: number; instances: number; name: string; material: string; at: number[] }[] = [];
        let total = 0;
        scene.traverseVisible((o) => {
          const mesh = o as THREE.InstancedMesh;
          if (!mesh.isMesh) return;
          const g = mesh.geometry;
          const instances = mesh.isInstancedMesh ? mesh.count : 1;
          const triangles = Math.round(((g.index ? g.index.count : g.attributes.position.count) / 3) * instances);
          total += triangles;
          const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
          if (!g.boundingSphere) g.computeBoundingSphere();
          const c = g.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld);
          rows.push({ triangles, instances, name: o.name || o.parent?.name || '', material: `${mat.name || mat.type} ${mat.color ? mat.color.getHexString() : ''}`, at: c.toArray().map((v) => Math.round(v)) });
        });
        rows.sort((a, b) => b.triangles - a.triangles);
        return { total, meshes: rows.slice(0, n) };
      },
    };
  }

  // If the device cannot keep up, give ground quietly: first resolution, then the
  // contact shadows. If it has room to spare, take the resolution back.
  const dprMax = dpr;
  let govLast = performance.now();
  let govSum = 0;
  let govN = 0;
  function govern() {
    const now = performance.now();
    const raw = now - govLast;
    govLast = now;
    // a hidden or throttled tab says nothing about the graphics chip
    if (document.hidden || raw > 250) {
      govSum = 0;
      govN = 0;
      return;
    }
    govSum += raw;
    if (++govN < 90) return;
    const avg = govSum / govN;
    govSum = 0;
    govN = 0;
    if (avg > 42) {
      if (dpr > 0.8) {
        dpr = Math.max(0.75, dpr - 0.25);
        resize();
      } else if (gtao?.enabled) {
        gtao.enabled = false;
      }
    } else if (avg < 19 && dpr < dprMax) {
      dpr = Math.min(dprMax, dpr + 0.25);
      resize();
    }
  }

  const timer = new THREE.Timer();
  timer.connect(document);
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  let idle = 0;

  const hitches: { ms: number; zone: string; programs: number }[] = [];
  /** False while a scripted test walks without wanting the frames drawn (development hook only). */
  let drawing = true;
  function frame() {
    timer.update();
    const f0 = performance.now();
    const dt = Math.min(timer.getDelta(), 0.05);
    govern();
    const t = timer.getElapsed();

    if (flight) {
      flight.t += dt / flight.dur;
      const k = flight.t >= 1 ? 1 : 0.5 - Math.cos(Math.PI * flight.t) / 2;
      pos.lerpVectors(flight.from, flight.to, k);
      // arc up a little on long flights, like a drone
      const d = flight.from.distanceTo(flight.to);
      pos.y += Math.sin(Math.PI * k) * Math.min(40, d * 0.25) * (nav.zoneAt(flight.to).inside ? 0 : 1);
      yaw = THREE.MathUtils.lerp(flight.yaw0, flight.yaw1, k);
      pitch = THREE.MathUtils.lerp(flight.pitch0, flight.pitch1, k);
      if (flight.t >= 1) flight = null;
    } else {
      // walking: keys and the joystick
      let mx = 0;
      let mz = 0;
      if (keys.has('w') || keys.has('arrowup')) mz -= 1;
      if (keys.has('s') || keys.has('arrowdown')) mz += 1;
      if (keys.has('a')) mx -= 1;
      if (keys.has('d')) mx += 1;
      if (keys.has('arrowleft')) yaw += dt * 1.8;
      if (keys.has('arrowright')) yaw -= dt * 1.8;
      mx += joyVec.x;
      mz += joyVec.y;
      const zone = nav.zoneAt(pos);
      // A ladder: face the wall and push forward to climb, pull back to come down.
      // While you are on it there is no walking, and nothing pulls you off when you let go.
      let onLadder = false;
      const lad = nav.ladderAt(pos);
      if (lad) {
        const feet = pos.y - EYE;
        const facingWall = -Math.sin(yaw) * lad.wallX - Math.cos(yaw) * lad.wallZ > 0.25;
        const up = mz < -0.2 && facingWall && feet < lad.top;
        const down = mz > 0.2 && feet > lad.bottom + 0.02;
        const between = feet > lad.bottom + 0.15 && feet < lad.top - 0.15;
        if (up || down) {
          pos.y = THREE.MathUtils.clamp(pos.y + (up ? 1 : -1) * 2.6 * dt * Math.min(1, Math.abs(mz)), lad.bottom + EYE, lad.top + EYE);
          // hands on the rungs: drift to the ladder itself
          pos.x = THREE.MathUtils.lerp(pos.x, lad.x, Math.min(1, dt * 6));
          pos.z = THREE.MathUtils.lerp(pos.z, lad.z, Math.min(1, dt * 6));
          onLadder = true;
        } else if (between) {
          onLadder = true;
        }
      }
      if (!onLadder && (mx || mz)) {
        const speed = (keys.has('shift') ? 2.2 : 1) * (zone.inside ? 3.2 : zone.speed ?? 6);
        fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        right.set(Math.cos(yaw), 0, -Math.sin(yaw));
        const step = new THREE.Vector3().addScaledVector(fwd, -mz).addScaledVector(right, mx);
        if (step.lengthSq() > 1) step.normalize();
        const next = pos.clone().addScaledVector(step, speed * dt);
        pos.copy(nav.move(pos, next));
        // settle onto the floor at eye height when walking somewhere with a floor
        const floor = nav.floorAt(pos);
        if (floor !== null && (zone.inside || pos.y - floor < 9)) pos.y = THREE.MathUtils.lerp(pos.y, floor + EYE, Math.min(1, dt * 8));
      }
      // Q and E fly, out of doors only: indoors there is a ceiling. E comes down to whatever is underneath.
      if (!zone.inside && !onLadder) {
        if (keys.has('q')) pos.y += dt * 8;
        if (keys.has('e')) pos.y = Math.max((nav.floorAt(pos) ?? 0) + EYE, pos.y - dt * 8);
      }
      // Before anyone touches anything, the aerial view drifts slowly round the block.
      if (!begun && current.id === world.viewpoints[0].id) {
        idle += dt;
        const c = world.viewpoints[0].target;
        const r = Math.hypot(world.viewpoints[0].position.x - c.x, world.viewpoints[0].position.z - c.z);
        const a0 = Math.atan2(world.viewpoints[0].position.x - c.x, world.viewpoints[0].position.z - c.z) + idle * 0.035;
        pos.set(c.x + Math.sin(a0) * r, world.viewpoints[0].position.y, c.z + Math.cos(a0) * r);
        const a = aim(c, pos);
        yaw = a.yaw;
        pitch = a.pitch;
      }
    }

    euler.set(pitch, yaw, 0);
    camera.position.copy(pos);
    camera.quaternion.setFromEuler(euler);

    const zone = nav.zoneAt(pos);
    // beat clock from the audio when it runs, otherwise from the wall clock, at the tempo of what is heard here
    const at = audioTime();
    const bpm = tempoOf(zone.track);
    const beat = (at >= 0 ? at : t) * (bpm / 60);
    // the words on screen follow the room: walk out of the one a caption was written for and it changes
    if (!flight && zone.id !== captionZone) {
      captionZone = zone.id;
      caption(zone.caption, null);
    }
    if (import.meta.env.DEV) renderer.info.reset();
    world.update(dt, t, beat, camera, zone, bpm);
    setInside(zone.music, zone.loudness, zone.echo, zone.track);
    bloom.strength = zone.inside ? 0.85 : world.time().bloom;
    grain.uniforms.time.value = t;
    renderer.toneMappingExposure = zone.exposure ?? 1;
    if (drawing) composer.render();
    if (import.meta.env.DEV) {
      const ms = performance.now() - f0;
      if (ms > 50) hitches.push({ ms: Math.round(ms), zone: zone.id, programs: renderer.info.programs?.length ?? 0 });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
