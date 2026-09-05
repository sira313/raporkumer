/**
 * Drag-and-drop activation helper.
 *
 * Touch input: tap-and-hold (long-press) then drag, so normal taps, scrolls and
 * long-press menus are never hijacked.
 * Mouse input in `live` mode: click-and-drag immediately (no hold), replacing
 * the native HTML5 drag ghost with the same live-list behavior.
 */
interface OptionsBase {
	/** Disables the drag when false (same visual gating as `draggable`). */
	enabled?: boolean;
	/**
	 * Live reorder mode: no floating ghost is shown. Instead, onDragOver fires
	 * whenever the pointer hovers a different drop target while dragging,
	 * letting the page reorder its list in real time. No `drop` is dispatched.
	 */
	live?: boolean;
	/** Used by `live` mode: fired when the hovered drop target changes. */
	onDragOver?: (target: HTMLElement) => void;
}

export interface TouchDragSourceOptions extends OptionsBase {
	/** Returns the payload delivered to the drop target on drop. */
	dragData: () => { kode: string; kelasId?: number };
	/** Fired once when the long-press threshold passes and a drag begins. */
	onDragStart?: () => void;
	/** Long-press hold in ms before the drag activates. Default 450. */
	delay?: number;
	/** Movement in px that cancels the hold gesture. Default 10. */
	moveThreshold?: number;
}

export interface DropTargetOptions {
	enabled?: boolean;
}

interface ActiveTouch {
	pointer: 'touch' | 'mouse';
	id: number;
	el: HTMLElement;
	startX: number;
	startY: number;
	lastX: number;
	lastY: number;
	active: boolean;
	timer: number | null;
	ghost: HTMLElement | null;
	lastTarget: HTMLElement | null;
	data: Record<string, string> | null;
	opts: TouchDragSourceOptions;
}

let active: ActiveTouch | null = null;
let suppressNextClick = false;

function distance(a: ActiveTouch, x: number, y: number) {
	return Math.hypot(x - a.startX, y - a.startY);
}

function onDocTouchMove(e: TouchEvent) {
	const a = active;
	if (!a) return;
	const touch = [...e.touches].find((t) => t.identifier === a.id);
	if (!touch) return;
	const deltaX = touch.clientX - a.startX;
	const deltaY = touch.clientY - a.startY;
	const moved = Math.hypot(deltaX, deltaY);

	if (!a.active) {
		// Still inside the long-press hold: moving cancels the gesture so the
		// page keeps scrolling/tapping normally.
		if (moved > (a.opts.moveThreshold ?? 10)) teardown(false);
		return;
	}
	e.preventDefault();
	a.lastX = touch.clientX;
	a.lastY = touch.clientY;
	if (a.opts.live) {
		onLiveHover(a);
	} else if (a.ghost) {
		a.ghost.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
	}
	autoScroll(a.el, a.lastX, a.lastY);
}

function onLiveHover(a: ActiveTouch) {
	const target = findDropTarget(a.lastX, a.lastY);
	if (target !== a.lastTarget) {
		a.lastTarget = target;
		if (target) a.opts.onDragOver?.(target);
	}
}

function onDocTouchEnd(e: TouchEvent) {
	const a = active;
	if (!a) return;
	const touch = [...e.changedTouches].find((t) => t.identifier === a.id);
	finishPointer(touch?.clientX ?? a.lastX, touch?.clientY ?? a.lastY);
}

function setDraggingCursor(on: boolean) {
	if (typeof document === 'undefined') return;
	document.documentElement.classList.toggle('rapkumer-dragging', on);
}

function onDocMouseMove(e: MouseEvent) {
	const a = active;
	if (!a || a.pointer !== 'mouse') return;
	const moved = distance(a, e.clientX, e.clientY);
	if (!a.active) {
		// Mouse drags start immediately on movement (no long-press hold).
		if (moved > (a.opts.moveThreshold ?? 10)) {
			a.active = true;
			setDraggingCursor(true);
			beginGlobalSuppress();
			a.opts.onDragStart?.();
		} else {
			return;
		}
	}
	a.lastX = e.clientX;
	a.lastY = e.clientY;
	onLiveHover(a);
	autoScroll(a.el, a.lastX, a.lastY);
}

function onDocMouseUp(e: MouseEvent) {
	const a = active;
	if (!a || a.pointer !== 'mouse') return;
	finishPointer(e.clientX, e.clientY);
}

function onWindowBlur() {
	if (active?.pointer !== 'mouse') return;
	teardown(true);
}

function activateDrag() {
	const a = active;
	if (!a || a.active) return;
	a.active = true;
	a.timer = null;
	const payload = a.opts.dragData();
	a.data = {
		'text/plain': payload.kode,
		...(payload.kelasId !== undefined ? { 'application/x-kelas-id': String(payload.kelasId) } : {})
	};
	a.ghost = a.opts.live ? null : makeGhost(a.el);
	a.lastTarget = null;
	setDraggingCursor(true);
	a.opts.onDragStart?.();
}

function finishPointer(x: number, y: number) {
	const a = active;
	if (!a) return;
	if (!a.opts.live) {
		// A regular (ghost) drag delivers the drop at release. Live mode
		// reordered on hover, so no drop is dispatched here.
		if (a.active && a.data && a.ghost && distance(a, x, y) >= (a.opts.moveThreshold ?? 10)) {
			const target = findDropTarget(x, y);
			if (target) dispatchDrop(target, a.data);
		}
	}
	teardown(true);
}

function teardown(withDragEnd: boolean) {
	const a = active;
	if (!a) return;
	active = null;
	if (a.timer) clearTimeout(a.timer);
	document.removeEventListener('touchmove', onDocTouchMove, { capture: true });
	document.removeEventListener('touchend', onDocTouchEnd, { capture: true });
	document.removeEventListener('touchcancel', onDocTouchEnd, { capture: true });
	document.removeEventListener('mousemove', onDocMouseMove, { capture: true });
	document.removeEventListener('mouseup', onDocMouseUp, { capture: true });
	window.removeEventListener('blur', onWindowBlur);
	setDraggingCursor(false);
	endGlobalSuppress();
	if (a.ghost) a.ghost.remove();
	if (withDragEnd) {
		a.el.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true }));
	}
	if (a.active) {
		// A touchend/mouseup after a real drag can synthesize one stray click
		// on the drop target (e.g. a cell button). Swallow only that next click,
		// then self-clear so a later genuine click is never eaten.
		suppressNextClick = true;
		window.setTimeout(() => {
			suppressNextClick = false;
		}, 500);
	}
}

function onDocClickCapture(e: MouseEvent) {
	if (suppressNextClick) {
		suppressNextClick = false;
		e.preventDefault();
		e.stopPropagation();
	}
}

let clickGuardInstalled = false;
function ensureClickGuard() {
	if (clickGuardInstalled || typeof document === 'undefined') return;
	clickGuardInstalled = true;
	document.addEventListener('click', onDocClickCapture, true);
}

function beginGlobalSuppress() {
	ensureClickGuard();
	const b = document.body;
	if (b) {
		b.style.userSelect = 'none';
		b.style.webkitUserSelect = 'none';
		(b.style as CSSStyleDeclaration & { webkitTouchCallout: string }).webkitTouchCallout = 'none';
	}
	document.addEventListener('contextmenu', onGlobalContextMenu, true);
	document.addEventListener('selectstart', onGlobalSelectStart, true);
}

function endGlobalSuppress() {
	const b = document.body;
	if (b) {
		b.style.userSelect = '';
		b.style.webkitUserSelect = '';
		(b.style as CSSStyleDeclaration & { webkitTouchCallout: string }).webkitTouchCallout = '';
	}
	document.removeEventListener('contextmenu', onGlobalContextMenu, true);
	document.removeEventListener('selectstart', onGlobalSelectStart, true);
}

function onGlobalContextMenu(e: Event) {
	e.preventDefault();
}

function onGlobalSelectStart(e: Event) {
	e.preventDefault();
}

function findDropTarget(x: number, y: number): HTMLElement | null {
	const ep = document.elementFromPoint(x, y);
	const viaEp = ep?.closest<HTMLElement>('[data-touch-drop-target="true"]');
	if (viaEp) return viaEp;
	// Fallback: a full-screen overlay (e.g. a modal left in the DOM during a
	// drag) can block elementFromPoint even though a valid drop target sits
	// directly underneath. Walk all candidates and find the one whose bounding
	// rect contains the pointer.
	for (const t of document.querySelectorAll<HTMLElement>('[data-touch-drop-target="true"]')) {
		const r = t.getBoundingClientRect();
		if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return t;
	}
	return null;
}

function dispatchDrop(target: HTMLElement, data: Record<string, string>) {
	const evt = new DragEvent('drop', { bubbles: true, cancelable: true });
	Object.defineProperty(evt, 'dataTransfer', {
		configurable: true,
		value: {
			getData: (type: string) => data[type] ?? '',
			setData: () => undefined,
			effectAllowed: 'move',
			dropEffect: 'move'
		}
	});
	target.dispatchEvent(evt);
}

function makeGhost(source: HTMLElement): HTMLElement {
	const rect = source.getBoundingClientRect();
	const clone = source.cloneNode(true) as HTMLElement;
	let wrapper: HTMLElement = clone;
	if (source instanceof HTMLTableRowElement) {
		const table = document.createElement('table');
		const body = document.createElement('tbody');
		body.appendChild(clone);
		table.appendChild(body);
		wrapper = table;
	} else if (source instanceof HTMLTableCellElement) {
		const table = document.createElement('table');
		const tr = document.createElement('tr');
		tr.appendChild(clone);
		const body = document.createElement('tbody');
		body.appendChild(tr);
		table.appendChild(body);
		wrapper = table;
	}
	wrapper.style.cssText =
		`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;` +
		'pointer-events:none;z-index:9999;opacity:.85;margin:0;box-shadow:0 8px 24px rgba(0,0,0,.15);';
	wrapper.setAttribute('aria-hidden', 'true');
	document.body.appendChild(wrapper);
	return wrapper;
}

function autoScroll(source: HTMLElement, x: number, y: number) {
	if (!source.isConnected) return;
	let scroller: HTMLElement | null = source;
	while (scroller) {
		if (scroller.scrollHeight > scroller.clientHeight + 4) break;
		scroller = scroller.parentElement;
	}
	if (scroller) {
		const r = scroller.getBoundingClientRect();
		if (y < r.top + 56) scroller.scrollTop -= 24;
		else if (y > r.bottom - 56) scroller.scrollTop += 24;
	}
	if (y < 90) window.scrollBy(0, -24);
	else if (y > window.innerHeight - 90) window.scrollBy(0, 24);
}

export function touchDragSource(node: HTMLElement, options: TouchDragSourceOptions) {
	let opts = options;
	let mouseDragging = false;

	function onMouseDown(e: MouseEvent) {
		if (opts.enabled === false || active) return;
		if (!opts.live || e.button !== 0) return;
		const target = e.target as HTMLElement;
		// Never hijack interactive descendants (buttons, links, selects).
		if (target.closest('button, a, input, select, textarea, [data-no-touch-drag]')) return;
		active = {
			pointer: 'mouse',
			id: -1,
			el: node,
			startX: e.clientX,
			startY: e.clientY,
			lastX: e.clientX,
			lastY: e.clientY,
			active: false,
			timer: null,
			ghost: null,
			lastTarget: null,
			data: null,
			opts
		};
		document.addEventListener('mousemove', onDocMouseMove, { capture: true });
		document.addEventListener('mouseup', onDocMouseUp, { capture: true });
		window.addEventListener('blur', onWindowBlur);
	}

	function onTouchStart(e: TouchEvent) {
		if (opts.enabled === false || active) return;
		const target = e.target as HTMLElement;
		// Never hijack interactive descendants (buttons, links, selects).
		if (target.closest('button, a, input, select, textarea, [data-no-touch-drag]')) return;
		if (e.touches.length !== 1) return;
		const touch = e.touches[0];
		active = {
			pointer: 'touch',
			id: touch.identifier,
			el: node,
			startX: touch.clientX,
			startY: touch.clientY,
			lastX: touch.clientX,
			lastY: touch.clientY,
			active: false,
			timer: null,
			ghost: null,
			lastTarget: null,
			data: null,
			opts
		};
		beginGlobalSuppress();
		document.addEventListener('touchmove', onDocTouchMove, { passive: false, capture: true });
		document.addEventListener('touchend', onDocTouchEnd, { capture: true });
		document.addEventListener('touchcancel', onDocTouchEnd, { capture: true });
		active.timer = window.setTimeout(activateDrag, opts.delay ?? 450);
	}

	function onDragStart(e: DragEvent) {
		if (opts.enabled === false) return;
		// iPad Safari can start a native drag from touch on `draggable`
		// elements, and an active custom mouse drag reaches a native dragstart
		// too. In both cases the custom path owns this node: cancel the native
		// drag so the two never run at the same time (and no ghost appears).
		if (active && active.el === node) {
			e.preventDefault();
			return;
		}
		mouseDragging = true;
		beginGlobalSuppress();
	}

	function onDragEnd() {
		if (!mouseDragging) return;
		mouseDragging = false;
		endGlobalSuppress();
	}

	node.addEventListener('touchstart', onTouchStart, { passive: true });
	if (opts.live) node.addEventListener('mousedown', onMouseDown);
	node.addEventListener('dragstart', onDragStart);
	node.addEventListener('dragend', onDragEnd);

	return {
		update(o: TouchDragSourceOptions) {
			const hadMouse = opts.live;
			opts = o;
			if (opts.live && !hadMouse) node.addEventListener('mousedown', onMouseDown);
			else if (!opts.live && hadMouse) node.removeEventListener('mousedown', onMouseDown);
		},
		destroy() {
			// Never tear down an in-flight drag that originated from this node
			// (the node may be destroyed mid-drag, e.g. the code modal closing).
			node.removeEventListener('touchstart', onTouchStart);
			node.removeEventListener('mousedown', onMouseDown);
			node.removeEventListener('dragstart', onDragStart);
			node.removeEventListener('dragend', onDragEnd);
		}
	};
}

export function dropTarget(node: HTMLElement, options: DropTargetOptions = {}) {
	let opts = options;
	function apply() {
		if (opts.enabled === false) {
			node.removeAttribute('data-touch-drop-target');
		} else {
			node.setAttribute('data-touch-drop-target', 'true');
		}
	}
	apply();
	return {
		update(o: DropTargetOptions) {
			opts = o;
			apply();
		},
		destroy() {
			node.removeAttribute('data-touch-drop-target');
		}
	};
}
