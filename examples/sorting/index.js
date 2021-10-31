import { useStatefulRefValue, isFunction } from '@react-lit/helper';
import { useMemo, useRef, useState } from 'react';
import {
	createDescendantContext,
	DescendantProvider,
	useDescendant,
	useDescendantsInit,
} from '../../src/index';

export function Example() {
	let [items, setItems] = useState([0, 1, 2, 3, 4, 5]);

	return (
		<>
			<h2>Example: Sorting</h2>
			<div>
				<button
					onClick={() => {
						setItems(items => [...items].sort(() => 0.5 - Math.random()));
					}}
				>
					Randomize
				</button>
				<hr />
				<ListProvider>
					{items.map((item, i) => (
						<ListItem
							key={item}
							index={i}
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

const ListItem = ({ children, index: indexProp, ...rest }) => {
	let ref = useRef(null);
	let [element, handleRefSet] = useStatefulRefValue(ref, null);
	let descendant = useMemo(() => ({ element }), [element]);
	let index = useDescendant(descendant, DescendantContext, indexProp);

	return (
		<div data-index={index} ref={handleRefSet} {...rest}>
			{isFunction(children) ? children({ index }) : children}
		</div>
	);
};
