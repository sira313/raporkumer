<!-- 

MIT License
Copyright (c) 2025 Habib Mustofa

-->

<script lang="ts" generics="T extends string | number | Record<string, unknown>">
	import { browser } from '$app/environment';
	import { tick, type Snippet } from 'svelte';
	import { toast } from './toast.svelte';

	interface PropsObjectOptions {
		mode: 'object';
		options: T;
		value?: keyof T | null;
	}

	interface PropsArrayOptions {
		mode: 'array';
		options: Array<T>;
		transform: (item: T) => SelectItem;
		value?: SelectItem['value'] | null;
	}

	interface PropsRemoteOptions {
		mode: 'remote';
		$type: T;
		url: string;
		searchParams?: (query: string) => [string, string][] | Record<string, string>;
		transform: (item: T) => SelectItem;
		value?: [SelectItem['value'], SelectItem['display']] | null;
	}

	type Props = (PropsObjectOptions | PropsArrayOptions | PropsRemoteOptions) & {
		class?: string;
		placeholder?: string;
		form?: string;
		name?: string;
		required?: boolean;
		disabled?: boolean;
		listItem?: Snippet<[{ item: T; index: number; active: boolean }]>;
	};

	interface SelectItem {
		value: string | number;
		display: string;
		data: T;
	}

	const id = $props.id();
	const minPopoverWidth = 256;

	let props: Props = $props();
	let input: HTMLInputElement;
	let ol: HTMLOListElement;
	let remoteQueryTimer: ReturnType<typeof setTimeout>;

	let searchQuery = $state('');
	let activeIndex = $state(-1);
	let shown = $state(false);
	let popoverWidth = $state(0);
	let loading = $state(false);
	let selected = $state<SelectItem | undefined>();
	let items = $state<SelectItem[]>([]);

	const filteredItems = $derived.by(() => {
		if (!searchQuery) return items;
		return items.filter((i) => i.display.toLowerCase().includes(searchQuery.toLowerCase()));
	});

	function showPopover() {
		const inputWidth = input.offsetWidth;
		popoverWidth = inputWidth < minPopoverWidth ? minPopoverWidth : inputWidth;
		ol.showPopover();
	}

	function hidePopover() {
		ol.hidePopover();
	}

	function setSelected(index: number) {
		selected = filteredItems[index];
		if (searchQuery) activeIndex = -1;
		checkFormValidity();
		hidePopover();
	}

	function checkFormValidity() {
		tick().then(() => {
			input?.form?.dispatchEvent(
				new Event('input', {
					bubbles: true,
					cancelable: true
				})
			);
		});
	}

	async function transformItems() {
		if (props.mode == 'object') {
			items = Object.entries(props.options).map(([key, value]) => ({
				value: key,
				display: String(value),
				data: value as T
			}));
		} else if (props.mode == 'array') {
			items = props.options.map(props.transform);
		} else if (props.mode == 'remote') {
			items = await loadRemoteItems();
		}

		if (props.value) {
			if (props.mode == 'remote') {
				const [value, display] = props.value;
				selected = { value, display, data: <T>{} };
			} else {
				activeIndex = items.findIndex((i) => i.value == props.value);
				selected = items[activeIndex];
			}
		}

		if (browser) checkFormValidity();
	}

	async function loadRemoteItems(search?: string) {
		if (props.mode != 'remote' || !browser) return [];
		try {
			loading = true;
			const searchParam = new URLSearchParams(
				props.searchParams?.(search || '') || [['q', search || '']]
			);
			const request = await fetch(`${props.url}?${searchParam}`);
			const json: Array<T> = await request.json();
			return json.map(props.transform);
		} catch (error) {
			console.error(error);
			const message = error instanceof Error ? error.message : JSON.stringify(error);
			toast(message, 'error');
			return [];
		} finally {
			loading = false;
		}
	}

	function onNavigate(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' && shown) {
			if (activeIndex !== filteredItems.length - 1) {
				e.preventDefault();
				++activeIndex;
				ensureItemVisible();
			}
		} else if (e.key === 'ArrowUp' && shown) {
			if (activeIndex >= 0) {
				e.preventDefault();
				--activeIndex;
				ensureItemVisible();
			}
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (!shown) {
				showPopover();
			} else if (~activeIndex) {
				setSelected(activeIndex);
			}
		} else if (e.key === 'Escape') {
			if (shown) {
				e.preventDefault();
				hidePopover();
			}
		}
	}

	/**
	 * adjust item position automatically when manual scrolling
	 */
	function ensureItemVisible() {
		const item = ol.children.item(activeIndex) as HTMLLIElement;
		if (item && ol.scrollHeight > ol.clientHeight) {
			const scrollBottom = ol.clientHeight + ol.scrollTop;
			const elementBottom = item.offsetTop + item.offsetHeight;
			if (elementBottom > scrollBottom) {
				ol.scrollTop = elementBottom - ol.clientHeight;
			} else if (item.offsetTop < ol.scrollTop) {
				ol.scrollTop = item.offsetTop;
			}
		}
	}

	function handleBlur() {
		input.value = selected ? selected.display : '';
		checkFormValidity();
		hidePopover();
	}

	function handleInput(e: Event) {
		if (!shown) showPopover();

		const value = (e.target as HTMLInputElement).value;
		if (!value) {
			selected = undefined;
		}

		activeIndex = -1;
		searchQuery = value;
		if (props.mode == 'remote' && !filteredItems.length) {
			clearTimeout(remoteQueryTimer);
			loading = true;
			remoteQueryTimer = setTimeout(async () => {
				items = await loadRemoteItems(searchQuery);
			}, 650);
		}
	}

	transformItems();
</script>

<input
	bind:this={input}
	id="select-enhance-input-{id}"
	class={props.class || ''}
	type="search"
	style="anchor-name:--anchor-{id}"
	onfocus={showPopover}
	onclick={showPopover}
	onblur={handleBlur}
	onkeydown={onNavigate}
	oninput={handleInput}
	spellcheck="false"
	autocomplete="off"
	placeholder={props.placeholder}
	required={props.required}
	disabled={props.disabled}
	value={selected?.display}
/>

<!-- 
	Unfortunately, we can't use `form-enhance#init` here because 
	setting `input.value` doesn't trigger any events. Using a 
	custom event would add unnecessary complexity, so we need 
	to manually initialize the value for this component.
	-->
<input form={props.form} name={props.name} value={selected?.value} hidden />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<ol
	bind:this={ol}
	class="dropdown menu rounded-box bg-base-200 max-h-56 shadow-sm"
	style="position-anchor:--anchor-{id}; width: {popoverWidth}px;"
	onmousedown={(e) => {
		// prevent close popover when item click
		e.preventDefault();
		return false;
	}}
	ontoggle={(e) => {
		shown = e.newState == 'open';
		if (e.newState == 'closed') {
			// still struggling with animation but ok for now
			requestAnimationFrame(() => {
				searchQuery = '';
			});
		}
	}}
	popover
>
	{#each filteredItems as item, index (item)}
		{@const active = index == activeIndex}
		<li
			onkeypress={() => 0}
			onclick={(e) => {
				e.preventDefault();
				activeIndex = index;
				setSelected(index);
				return false;
			}}
		>
			{#if props.listItem}
				{@render props.listItem({ item: item.data, index, active })}
			{:else}
				<div class:menu-focus={active}>{item.display}</div>
			{/if}
		</li>
	{:else}
		<li class="menu-disabled italic">
			<p class="justify-center">
				{loading ? 'Loading...' : 'Tidak ada pilihan'}
			</p>
		</li>
	{/each}
</ol>
