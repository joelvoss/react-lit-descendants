import { useStatefulRefValue, isFunction } from '@react-lit/helper';
import { useMemo, useRef, useState } from 'react';
import {
	createDescendantContext,
	DescendantProvider,
	useDescendant,
	useDescendantsInit,
} from '../../src/index';

export function Example() {
	let addBtn = useRef(null);
	let [{ items, inputValue }, set] = useState(() => ({
		items: [],
		inputValue: '',
	}));

	return (
		<>
			<h2>Example: Add and remove</h2>
			<div>
				<form
					onSubmit={event => {
						event.preventDefault();
						let value = inputValue.trim();
						if (!value) {
							// eslint-disable-next-line no-console
							console.log('Please enter a value!');
							return;
						} else if (items.includes(value)) {
							// eslint-disable-next-line no-console
							console.log('Items in the list must be unique');
							return;
						}

						set(({ items }) => ({
							items: [...items, value],
							inputValue: '',
						}));
					}}
				>
					<div>
						<label>
							<input
								maxLength={7}
								type="text"
								name="add"
								ref={addBtn}
								autoComplete="off"
								required
								onChange={e => {
									let next = e.target.value;
									if (!next.includes(' ')) {
										set(({ items }) => ({
											items,
											inputValue: next,
										}));
									}
								}}
								value={inputValue}
							/>
						</label>
					</div>
					<button type="submit" disabled={!inputValue || undefined}>
						Add
					</button>
					<button
						type="button"
						disabled={items.length < 1 || undefined}
						onClick={() => {
							if (items.length < 1) {
								return;
							}
							set(({ items, inputValue }) => {
								let i = Math.floor(Math.random() * items.length);
								return {
									inputValue,
									items: [
										...items.slice(0, i),
										...items.slice(i + 1, items.length),
									],
								};
							});
						}}
					>
						Remove Random Item
					</button>
				</form>

				<hr />

				<ListProvider>
					{items.map((item, i) => (
						<ListItem
							key={item}
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								width: 200,
								maxWidth: '100%',
								gap: 10,
								fontFamily: 'monospace',
							}}
						>
							{({ index }) => (
								<>
									<div>Item: {item}</div>
									<div>Index: {index}</div>
								</>
							)}
						</ListItem>
					))}
				</ListProvider>
			</div>
		</>
	);
}

////////////////////////////////////////////////////////////////////////////////

const DescendantContext = createDescendantContext('DescendantContext');

////////////////////////////////////////////////////////////////////////////////

const ListProvider = ({ children }) => {
	let [descendants, setDescendants] = useDescendantsInit();
	return (
		<DescendantProvider
			context={DescendantContext}
			items={descendants}
			set={setDescendants}
		>
			{children}
		</DescendantProvider>
	);
};

////////////////////////////////////////////////////////////////////////////////

const ListItem = ({ children, ...rest }) => {
	let ref = useRef(null);
	let [element, handleRefSet] = useStatefulRefValue(ref, null);
	let descendant = useMemo(() => ({ element }), [element]);
	let index = useDescendant(descendant, DescendantContext);

	return (
		<div data-index={index} ref={handleRefSet} {...rest}>
			{isFunction(children) ? children({ index }) : children}
		</div>
	);
};
