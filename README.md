# @react-lit/descendants

A descendant index solution for better accessibility support in compound
components.

This package provides these key tools:

  * `createDescendantContext`: Creates a special context object to deal with
    registering descendants in a tree.
  * `useDescendantsInit`: A hook to create a state object containing a
    descendants array and setter function.
  * `DescendantProvider`: A provider that accepts the descendants array, the
    state setter, and the component's context object for use at the top of the
    component tree.
  * `useDescendant`: A hook called in the body of a nested descendant component
    that registers its DOM node and returns its index relative to other
    descendants in the tree.
  * `useDescendants`: A hook that accepts the descendant context and returns
    descendants registered to the passed context.

## Installation

```bash
$ npm i @react-lit/descendants
# or
$ yarn add @react-lit/descendants
```

## Example

```js
import * as React from 'react';
import {
  createDescendantContext,
  DescendantProvider,
  useDescendant,
  useDescendantsInit,
} from "@react-lit/descendants";

const DescendantContext = createDescendantContext("DescendantContext");
const MenuContext = React.createContext();

function Menu({ id, children }) {
  // NOTE(joel): We could be less explicit here and set this up in the
  // `DescendantProvider`, but you may want to do something with `descendants`
  // in your top-level component and we don't want to force creating an
  // arbitrary child component just so we can consume the context.
  const [descendants, setDescendants] = useDescendantsInit();
  const [activeIndex, setActiveIndex] = React.useState(-1);
  return (
    <DescendantProvider
      context={DescendantContext}
      items={descendants}
      set={setDescendants}
    >
      <MenuContext.Provider
        value={{ buttonId: `button`, activeIndex, setActiveIndex }}
      >
        {children}
      </MenuContext.Provider>
    </DescendantProvider>
  );
}

function MenuList(props) {
  const { buttonId, activeIndex } = React.useContext(MenuContext);
  return (
    <div
      role="menu"
      aria-labelledby={buttonId}
      aria-activedescendant={activeIndex}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

function MenuItem({ index: explicitIndex, ...props }) {
  const { activeIndex, setActiveIndex } = React.useContext(MenuContext);
  const ref = React.useRef(null);

  // NOTE(joel): We use a stateful ref here because we need the actual DOM
  // element for our descendant object, but also need to update state after
  // the dom ref is placed.
  const [element, elementSet] = React.useState(null);
  const handleRefSet = React.useCallback((refValue) => {
    ref.current = refValue;
    elementSet(refValue);
  }, []);

  // NOTE(joel): The descendant should be memoized to prevent endless render
  // loops after the collection state is updated.
  const descendant = React.useMemo(() => {
    return {
      element,
      // NOTE(joel): You can pass arbitrary data into a descendant object which
      // can come in handy for features like typeahead!
      key: props.label,
    };
  }, [element, props.label]);

  // NOTE(joel): Tell the `useDescendant` hook to use a specific context.
  // This is key in case you have a compound component that needs index
  // tracking in separate correlating descendant components (like `Tabs`)
  // If you want to declare a specific index value, you can pass it as the
  // third argument here. This is almost never needed but we provide it as an
  // escape hatch for special circumstances.
  const index = useDescendant(descendant, DescendantContext, explicitIndex);

  // NOTE(joel): After we know the index, we can use it!
  const isSelected = index === activeIndex;
  function select() {
    if (!isSelected) {
      setActiveIndex(index);
    }
  }

  return (
    <div
      role="menuitem"
      ref={handleRefSet}
      data-selected={isSelected ? "" : undefined}
      tabIndex={-1}
      onMouseEnter={select}
      {...props}
    />
  );
}
```

## Development

(1) Install dependencies

```bash
$ npm i
# or
$ yarn
```

(2) Run initial validation

```bash
$ ./Taskfile.sh validate
```

(3) Run tests in watch-mode to validate functionality.

```bash
$ ./Taskfile test -w
```

---

_This project was set up by @jvdx/core_
