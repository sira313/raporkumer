import type { Action } from 'svelte/action';

/**
 * Enables arrow-key navigation between checkbox inputs within a container.
 * - ArrowRight / ArrowDown: move focus to the next checkbox
 * - ArrowLeft / ArrowUp: move focus to the previous checkbox
 * - Home / End: jump to the first / last checkbox
 */
export const checkboxArrowNavigation: Action<HTMLElement> = (node) => {
	let checkboxes: HTMLInputElement[] = [];

	const collect = () => {
		checkboxes = Array.from(
			node.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
		).filter((checkbox) => !checkbox.disabled);
	};

	collect();

	const observer = new MutationObserver(() => {
		collect();
	});

	observer.observe(node, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['disabled']
	});

	const findAdjacentInColumn = (
		startIndex: number,
		direction: 1 | -1,
		column: string | undefined
	) => {
		let index = startIndex + direction;
		while (index >= 0 && index < checkboxes.length) {
			const candidate = checkboxes[index];
			const candidateColumn = candidate.dataset.checkboxColumn;
			if (!column || candidateColumn === column) {
				return index;
			}
			index += direction;
		}
		return startIndex;
	};

	const findEdgeInColumn = (column: string | undefined, fromEnd = false) => {
		if (!column) {
			return fromEnd ? checkboxes.length - 1 : 0;
		}

		if (fromEnd) {
			for (let i = checkboxes.length - 1; i >= 0; i -= 1) {
				if (checkboxes[i].dataset.checkboxColumn === column) {
					return i;
				}
			}
		} else {
			for (let i = 0; i < checkboxes.length; i += 1) {
				if (checkboxes[i].dataset.checkboxColumn === column) {
					return i;
				}
			}
		}

		return fromEnd ? checkboxes.length - 1 : 0;
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (
			!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)
		) {
			return;
		}

		const target = event.target;
		if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
			return;
		}

		if (checkboxes.length === 0) {
			return;
		}

		const currentIndex = checkboxes.indexOf(target);
		if (currentIndex === -1) {
			collect();
			return;
		}

		const column = target.dataset.checkboxColumn;
		let newIndex = currentIndex;

		switch (event.key) {
			case 'ArrowRight':
				newIndex = Math.min(currentIndex + 1, checkboxes.length - 1);
				break;
			case 'ArrowLeft':
				newIndex = Math.max(currentIndex - 1, 0);
				break;
			case 'ArrowDown':
				newIndex = findAdjacentInColumn(currentIndex, 1, column);
				break;
			case 'ArrowUp':
				newIndex = findAdjacentInColumn(currentIndex, -1, column);
				break;
			case 'Home':
				newIndex = findEdgeInColumn(column, false);
				break;
			case 'End':
				newIndex = findEdgeInColumn(column, true);
				break;
		}

		if (newIndex !== currentIndex) {
			event.preventDefault();
			checkboxes[newIndex]?.focus();
		}
	};

	node.addEventListener('keydown', handleKeydown, true);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown, true);
			observer.disconnect();
		}
	};
};
