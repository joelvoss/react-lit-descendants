import * as React from 'react';
import {
	useForceUpdate,
	useIsomorphicLayoutEffect as useLayoutEffect,
	noop,
	createNamedContext,
} from '@react-lit/helper';

////////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {Element | HTMLElement} SomeElement
 */

/**
 * @typedef {Object} Descendant
 * @prop {SomeElement | null} element
 * @prop {number} index
 */

/**
 * @typedef {Object} DescendantContextValue
 * @prop {Array<Descendant>} descendants
 * @prop {(descendant: Descendant) => void} registerDescendant
 * @prop {(element: Descendant['element']) => void} unregisterDescendant
 */

/**
 * createDescendantContext
 * @param {string} name
 * @param {any} [initialValue={}]
 */
export function createDescendantContext(name, initialValue = {}) {
	return createNamedContext(name, {
		descendants: [],
		registerDescendant: noop,
		unregisterDescendant: noop,
		...initialValue,
	});
}

////////////////////////////////////////////////////////////////////////////////

/**
 * useDescendantsInit
 * @returns [any[], React.Dispatch<React.SetStateAction<any[]>>]
 */
export function useDescendantsInit() {
	return React.useState([]);
}

////////////////////////////////////////////////////////////////////////////////

/**
 * useDescendants
 * @param {React.Context<DescendantContextValue>} ctx
 * @returns {DescendantContextValue['descendants']}
 */
export function useDescendants(ctx) {
	return React.useContext(ctx).descendants;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {Object} DescendantProviderProps
 * @prop {React.Context<DescendantContextValue>} context
 * @prop {React.ReactNode} children
 * @prop {Array<Descendant>} items
 * @prop {React.Dispatch<React.SetStateAction<Array<Descendant>>>} set
 */

/**
 * DescendantProvider
 * @param {DescendantProviderProps} props
 * @returns {React.ReactNode}
 */
export function DescendantProvider({ context: Ctx, children, items, set }) {
	const registerDescendant = React.useCallback(
		({ element, index: explicitIndex, ...rest }) => {
			if (!element) return;

			set(items => {
				let newItems;
				if (explicitIndex != null) {
					newItems = [...items, { ...rest, element, index: explicitIndex }];
					return newItems.sort((a, b) => a.index - b.index);
				}

				if (items.length === 0) {
					// NOTE(joel): if there are no registered items yet, simply add the
					// new item and index 0.
					newItems = [{ ...rest, element, index: 0 }];
				} else if (items.find(item => item.element === element)) {
					// NOTE(joel): If the new element is already registered, use the
					// existing items.
					newItems = items;
				} else {
					// NOTE(joel): We have to make sure the order of registered
					// descendants is the same as they appear in the DOM. To do this
					// we look up the actual order via `node.compareDocumentPosition`.
					let index = items.findIndex(item => {
						if (!item.element || !element) return false;
						return Boolean(
							item.element.compareDocumentPosition(element) &
								Node.DOCUMENT_POSITION_PRECEDING,
						);
					});

					let newItem = { ...rest, element, index };

					// NOTE(joel): If an index is not found we will push the element to
					// the end.
					if (index === -1) {
						newItems = [...items, newItem];
					} else {
						newItems = [
							...items.slice(0, index),
							newItem,
							...items.slice(index),
						];
					}
				}
				return newItems.map((item, index) => ({ ...item, index }));
			});
		},
		// NOTE(joel): `set` is a state setter initialized by the
		// `useDescendantsInit` hook. We can safely ignore the lint warning here
		// because it will not change between renders.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const unregisterDescendant = React.useCallback(
		element => {
			if (!element) return;

			set(items => items.filter(item => element !== item.element));
		},
		// NOTE(joel): `set` is a state setter initialized by the
		// `useDescendantsInit` hook. We can safely ignore the lint warning here
		// because it will not change between renders.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const contextValue = React.useMemo(
		() => ({
			descendants: items,
			registerDescendant,
			unregisterDescendant,
		}),
		[items, registerDescendant, unregisterDescendant],
	);

	return <Ctx.Provider value={contextValue}>{children}</Ctx.Provider>;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * useDescendant
 * @param {Descendant} descendant
 * @param {React.Context<DescendantContextValue>} context
 * @param {number} [indexProp=]
 */
export function useDescendant(descendant, context, indexProp) {
	let forceUpdate = useForceUpdate();
	let { registerDescendant, unregisterDescendant, descendants } =
		React.useContext(context);

	// NOTE(joel): This will initially return -1 because we haven't registered
	// the descendant yet.
	let index =
		indexProp ??
		descendants.findIndex(item => item.element === descendant.element);

	// NOTE(joel): Use a layout effect to prevent any flashing.
	useLayoutEffect(() => {
		if (!descendant.element) forceUpdate();

		registerDescendant({
			...descendant,
			index,
		});
		return () => {
			unregisterDescendant(descendant.element);
		};
	}, [
		descendant,
		forceUpdate,
		index,
		registerDescendant,
		unregisterDescendant,
		// NOTE(joel): The exhaustive-deps eslint rule cannot parse Object.values
		// so we have to silence it here.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		...Object.values(descendant),
	]);

	return index;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {Object} DescendantKeyDownOptions
 * @prop {number | null | undefined} currentIndex
 * @prop {'index' | 'option'} key
 * @prop {(descendant: Descendant) => boolean} filter
 * @prop {'vertical' | 'horizontal' | 'both'} orientation
 * @prop {boolean} rotate
 * @prop {boolean} rtl
 * @prop {(nextOption: Descendant | Descendant[K]) => void} callback
 */

/**
 * useDescendantKeyDown
 * @prop {React.Context<DescendantContextValue>} context
 * @prop {DescendantKeyDownOptions} options
 */
export function useDescendantKeyDown(context, options) {
	const { descendants } = React.useContext(context);
	const {
		callback,
		currentIndex,
		filter,
		key = 'index',
		orientation = 'vertical',
		rotate = true,
		rtl = false,
	} = options;

	/**
	 * handleKeyDown
	 * @param {React.KeyboardEvent} event
	 */
	function handleKeyDown(event) {
		if (
			![
				'ArrowDown',
				'ArrowUp',
				'ArrowLeft',
				'ArrowRight',
				'PageUp',
				'PageDown',
				'Home',
				'End',
			].includes(event.key)
		) {
			return;
		}

		const index = currentIndex ?? -1;

		// NOTE(joel): If a custom filter function is being used, we need to
		// re-index our descendants.
		const selectableDescendants = filter
			? descendants.filter(filter)
			: descendants;

		if (!selectableDescendants.length) return;

		const selectableIndex = selectableDescendants.findIndex(
			descendant => descendant.index === currentIndex,
		);

		/**
		 * getNextOption returns the next descendant in the list of descendants
		 * and handles looping around if we're at the last item of the list.
		 * @returns {Descendant}
		 */
		function getNextOption() {
			const atBottom = index === getLastOption().index;
			return atBottom
				? rotate
					? getFirstOption()
					: selectableDescendants[selectableIndex]
				: selectableDescendants[
						(selectableIndex + 1) % selectableDescendants.length
				  ];
		}

		/**
		 * getPreviousOption returns the previous descendant in the list of
		 * descendants and handles looping around if we're at the first item of the
		 * list.
		 * @returns {Descendant}
		 */
		function getPreviousOption() {
			const atTop = index === getFirstOption().index;
			return atTop
				? rotate
					? getLastOption()
					: selectableDescendants[selectableIndex]
				: selectableDescendants[
						(selectableIndex - 1 + selectableDescendants.length) %
							selectableDescendants.length
				  ];
		}

		/**
		 * getFirstOption returns the first descendant of our list.
		 * @returns {Descendant}
		 */
		function getFirstOption() {
			return selectableDescendants[0];
		}

		/**
		 * getLastOption returns the last descendant of our list.
		 * @returns {Descendant}
		 */
		function getLastOption() {
			return selectableDescendants[selectableDescendants.length - 1];
		}

		switch (event.key) {
			case 'ArrowDown': {
				if (orientation === 'vertical' || orientation === 'both') {
					event.preventDefault();
					let next = getNextOption();
					callback(key === 'option' ? next : next[key]);
				}
				break;
			}
			case 'ArrowUp': {
				if (orientation === 'vertical' || orientation === 'both') {
					event.preventDefault();
					let prev = getPreviousOption();
					callback(key === 'option' ? prev : prev[key]);
				}
				break;
			}
			case 'ArrowLeft': {
				if (orientation === 'horizontal' || orientation === 'both') {
					event.preventDefault();
					let nextOrPrev = (rtl ? getNextOption : getPreviousOption)();
					callback(key === 'option' ? nextOrPrev : nextOrPrev[key]);
				}
				break;
			}
			case 'ArrowRight': {
				if (orientation === 'horizontal' || orientation === 'both') {
					event.preventDefault();
					let prevOrNext = (rtl ? getPreviousOption : getNextOption)();
					callback(key === 'option' ? prevOrNext : prevOrNext[key]);
				}
				break;
			}
			case 'PageUp': {
				event.preventDefault();
				let prevOrFirst = (
					event.ctrlKey ? getPreviousOption : getFirstOption
				)();
				callback(key === 'option' ? prevOrFirst : prevOrFirst[key]);
				break;
			}
			case 'Home': {
				event.preventDefault();
				let first = getFirstOption();
				callback(key === 'option' ? first : first[key]);
				break;
			}
			case 'PageDown': {
				event.preventDefault();
				let nextOrLast = (event.ctrlKey ? getNextOption : getLastOption)();
				callback(key === 'option' ? nextOrLast : nextOrLast[key]);
				break;
			}
			case 'End': {
				event.preventDefault();
				let last = getLastOption();
				callback(key === 'option' ? last : last[key]);
				break;
			}
		}
	}

	return handleKeyDown;
}
