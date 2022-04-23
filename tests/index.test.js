import * as React from 'react';
import { render, userEvent } from './test-utils';

import {
	createDescendantContext,
	DescendantProvider,
	useDescendant,
	useDescendants,
	useDescendantsInit,
} from '../src/index';

////////////////////////////////////////////////////////////////////////////////

describe('createDescendantContext', () => {
	it(`should create a descendant context`, async () => {
		const DescendantContext = createDescendantContext('DescendantContext');

		expect(DescendantContext.displayName).toBe('DescendantContext');
		expect(Object.keys(DescendantContext._currentValue)).toEqual([
			'descendants',
			'registerDescendant',
			'unregisterDescendant',
		]);
	});
});

////////////////////////////////////////////////////////////////////////////////

describe('useDescendantsInit', () => {
	it('should create initial descendant state', () => {
		const Element = () => {
			const [state, stateSet] = useDescendantsInit();

			React.useEffect(() => {
				stateSet(['descendant-item']);
			}, []);

			return <div data-testid="elem">{JSON.stringify(state)}</div>;
		};

		const { getByTestId } = render(<Element />);

		const element = getByTestId('elem');
		expect(element.innerHTML).toBe('["descendant-item"]');
	});
});

////////////////////////////////////////////////////////////////////////////////

describe('useDescendants', () => {
	it('should return descendants stored in context', () => {
		const DescendantContext = createDescendantContext('DescendantContext', {
			descendants: ['descendant-item'],
		});

		const Element = () => {
			const descendants = useDescendants(DescendantContext);
			return <div data-testid="elem">{JSON.stringify(descendants)}</div>;
		};

		const { getByTestId } = render(<Element />);

		const element = getByTestId('elem');
		expect(element.innerHTML).toBe('["descendant-item"]');
	});
});

describe('DescendantProvider and useDescendant', () => {
	it('should provide and use the descendant context', () => {
		const DescendantContext = createDescendantContext('DescendantContext');

		function Menu({ children }) {
			const [descendants, setDescendants] = useDescendantsInit();
			return (
				<DescendantProvider
					context={DescendantContext}
					items={descendants}
					set={setDescendants}
				>
					{children}
				</DescendantProvider>
			);
		}

		function MenuItem() {
			const ref = React.useRef(null);
			const [element, elementSet] = React.useState(null);
			const handleRefSet = React.useCallback(refValue => {
				ref.current = refValue;
				elementSet(refValue);
			}, []);

			const descendant = React.useMemo(() => {
				return { element };
			}, [element]);

			const index = useDescendant(descendant, DescendantContext);

			return <div ref={handleRefSet}>Menu Item at index: {index}</div>;
		}

		const Layout = () => {
			return (
				<Menu>
					<MenuItem />
					<MenuItem />
					<p>Another item</p>
					<MenuItem />
				</Menu>
			);
		};

		const { baseElement } = render(<Layout />);
		expect(baseElement).toMatchSnapshot();
	});

	it('should index correctly when items change', async () => {
		const DescendantContext = createDescendantContext('DescendantContext');

		function Menu({ children }) {
			const [descendants, setDescendants] = useDescendantsInit();
			return (
				<DescendantProvider
					context={DescendantContext}
					items={descendants}
					set={setDescendants}
				>
					{children}
				</DescendantProvider>
			);
		}

		function MenuItem(props) {
			const ref = React.useRef(null);
			const [element, elementSet] = React.useState(null);
			const handleRefSet = React.useCallback(refValue => {
				ref.current = refValue;
				elementSet(refValue);
			}, []);

			const descendant = React.useMemo(() => {
				return { element };
			}, [element]);

			const index = useDescendant(descendant, DescendantContext);

			return (
				<div ref={handleRefSet} {...props}>
					Menu Item at index: {index}
				</div>
			);
		}

		const Layout = () => {
			const [items, itemsSet] = React.useState(['first', 'second', 'third']);

			return (
				<>
					<div data-testid="menu">
						<Menu>
							{items.map(i => {
								if (i === 'second') {
									return (
										<React.Fragment key={i}>
											<p>Another item</p>
											<MenuItem label={i} />
										</React.Fragment>
									);
								}
								return <MenuItem key={i} label={i} />;
							})}
						</Menu>
					</div>
					<button onClick={() => itemsSet(['first', 'third'])}>Remove</button>
				</>
			);
		};

		const { getByTestId, getByRole } = render(<Layout />);
		const menu = getByTestId('menu');
		expect(menu.innerHTML).toBe(
			'<div label="first">Menu Item at index: 0</div><p>Another item</p><div label="second">Menu Item at index: 1</div><div label="third">Menu Item at index: 2</div>',
		);

		const btn = getByRole('button');
		await userEvent.click(btn);

		expect(menu.innerHTML).toBe(
			'<div label="first">Menu Item at index: 0</div><div label="third">Menu Item at index: 1</div>',
		);
	});
});
