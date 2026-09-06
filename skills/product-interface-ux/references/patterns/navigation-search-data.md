# Navigation, search, and data patterns

Use these entries only after applying the source precedence and admission test in the [evidence ledger](../evidence-ledger.md). Pair them with [forms, navigation, and data](../forms-navigation-and-data.md), [accessibility contracts](../accessibility.md), and [interaction and state](../interaction-and-state.md); those policies outrank the editorial corpus and prevent a recipe from becoming a universal layout.

### Bulk Actions
- **Use when:** people must apply one operation to several records and individual repetition creates material cost or error risk.
- **Force:** `contextual` — comes from scope clarity: visible, loaded, selected, and all matching records are different sets, especially after filtering or paging.
- **Rule:** expose the selected count, consequence, availability, and whether selection survives page, query, refresh, or Back; never label an ambiguous set “all.”
- **Implementation:** keep stable record identifiers in application state, represent empty/partial/complete selection, update counts after dataset changes, and provide keyboard and touch-reachable row selection.
- **Exceptions:** selection may reset when changing context invalidates it, but announce the reset and reason; confirmation, immediate execution, undo, or review depends on reversibility and blast radius.
- **Verify:** select ranges, cross pages, filter mid-selection, retry partial failure, refresh, return from detail, use screen reader and keyboard, and test narrow/coarse-pointer layouts.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/bulk-actions) (editorial); [WCAG 2.2](https://www.w3.org/TR/WCAG22/); [HTML tables](https://html.spec.whatwg.org/multipage/tables.html); local evidence, accessibility, and interaction policies above.

### Context Menu
- **Use when:** contextual secondary actions benefit from proximity to an object without replacing visible primary actions or ordinary navigation.
- **Force:** `contextual` — comes from equivalent access: right-click and hover exclude touch, keyboard, switch, and discoverability-sensitive users when used alone.
- **Rule:** give the invoker an accessible name, preserve focus context, keep every action operable by keyboard, and offer a visible or touch-reachable equivalent path.
- **Implementation:** use menu semantics only for application-style commands, manage arrow-key focus and Escape predictably, position within the viewport, and restore focus to the invoker after dismissal.
- **Exceptions:** a native browser menu, visible action row, disclosure, or non-modal sheet may fit better; long press, submenu hover intent, and grouping are contextual, not required recipes.
- **Verify:** invoke by keyboard, pointer, right-click, long press, and hybrid input; test zoom, edges, scroll, disabled commands, async errors, nested dismissal, and invoker removal.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/context-menu) (editorial); [APG menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/); [WCAG 2.2](https://www.w3.org/TR/WCAG22/); local accessibility and interaction policies above.

### Dropdown Design
- **Use when:** a compact trigger must reveal a bounded set of choices or actions and visible presentation of every option would impede the task.
- **Force:** `contextual` — comes from semantics: select, disclosure, navigation menu, and application menu have different keyboard, value, and focus contracts despite similar appearance.
- **Rule:** prefer the native element that matches the job; for custom widgets, expose name, role, expanded/value state, relationships, dismissal, and a reachable error or empty state.
- **Implementation:** Keep the trigger stable and prevent viewport clipping. Preserve native behavior for `<select>`. A disclosure button opens with Enter/Space and closes with Escape while ordinary Tab order continues. A combobox exposes its editable value, active option, and list relationship; arrows move the active option, Enter commits, and Escape closes without committing a merely highlighted choice. An application menu uses its own roving-focus contract. Accommodate touch, zoom, virtual keyboards, IME composition for editable variants, and long localized labels.
- **Exceptions:** Search inside a long list, typeahead, animation, portal rendering, and upward opening depend on content and platform; none repairs choosing the wrong semantic pattern. Progressive enhancement may retain a native select or server-submitted form when custom behavior or remote suggestions fail.
- **Verify:** For the chosen branch, test its exact keys plus forward/reverse Tab, outside tap, focus restoration, selection versus highlight, IME composition, 400% zoom, coarse pointer, viewport edges, loading, no results, failure/retry, and operation with custom JavaScript unavailable where a fallback is promised.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/dropdown-design) (editorial); [HTML select](https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element); [APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/); local accessibility policy above.

### Search Experience System
- **Use when:** browsing is costly and users can express a meaningful query against a defined corpus, vocabulary, or set of fields.
- **Force:** `contextual` — comes from continuity and truth: query, filters, scope, sort, result count, pending state, zero results, and failure must not collapse into one ambiguous screen.
- **Rule:** identify what is searchable, retain the submitted query, distinguish no match from load error, and preserve URL state when refresh, sharing, or Back should reproduce the view.
- **Implementation:** use a labeled search control and submit behavior; debounce only when appropriate, cancel stale responses, associate suggestions correctly, announce settled results without narrating every keystroke, and retain focus sensibly.
- **Exceptions:** autocomplete, recent searches, fuzzy ranking, instant search, and category suggestions require product evidence and privacy review; a plain server-submitted search can be superior.
- **Verify:** test keyboard and touch submission, IME, paste, slow/out-of-order responses, offline retry, spelling variants, empty query, no results, URL restoration, zoom, and small viewports.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/search-experience-system) (editorial); [APG combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/); [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html); local forms/data policy above.

### Navigation Patterns
- **Use when:** shaping routes and wayfinding across destinations, hierarchy, repeated tasks, permissions, and responsive contexts.
- **Force:** `contextual` — comes from location continuity: users need to know where they are, reach primary destinations, and recover the same meaningful state after link sharing, refresh, or Back.
- **Rule:** make real navigation linkable with appropriate links and history; keep naming and information architecture stable across breakpoints rather than silently moving or renaming destinations.
- **Implementation:** encode durable route, query, and view state in URLs; preserve scroll or list context where useful; expose landmarks, current-page state, skip paths, logical focus order, and touch-accessible controls.
- **Exceptions:** bottom navigation, sidebar, top bar, drawer, breadcrumbs, and hamburger each depend on hierarchy, frequency, space, platform, and evidence; no destination count or desktop/mobile layout is universal.
- **Verify:** open in a new tab, deep-link, refresh, Back/Forward, permission change, 400% zoom, keyboard traversal, touch, RTL, long labels, and narrow/landscape viewports.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/navigation-patterns) (editorial); [HTML links](https://html.spec.whatwg.org/multipage/links.html); [WCAG 2.2](https://www.w3.org/TR/WCAG22/); local forms/data and accessibility policies above.

### Tabs System
- **Use when:** peer sections share one context and users benefit from switching without treating each section as an unrelated step or nested hierarchy.
- **Force:** `contextual` — comes from the distinction between focus and selection: keyboard users must know which tab has focus, which panel is active, and when activation loads content.
- **Rule:** follow tablist, tab, and tabpanel relationships; use arrows within the set, Tab to leave it, Home/End when supported, and choose manual activation when panel latency would impede focus movement.
- **Implementation:** keep DOM and visual order aligned, persist the active tab in the URL when it represents shareable navigational state, handle Back/refresh, expose loading/error per panel, and retain panel state deliberately.
- **Exceptions:** automatic activation is suitable only for effectively immediate panels; horizontal scrolling, wrapping alternatives, menus, segmented controls, and motion depend on space, count, semantics, and testing.
- **Verify:** test arrows, Home/End, manual versus automatic behavior, focus/selection contrast, deep links, Back, refresh, lazy-load failure, touch overflow, reflow, RTL, and reduced motion.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/tabs-system) (editorial); [APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/); [WCAG 2.2](https://www.w3.org/TR/WCAG22/); local accessibility and interaction policies above.

### Focus States
- **Use when:** any interactive interface supports keyboard, switch, voice-assisted, or mixed-input operation; visible focus is a cross-pattern contract, not decoration.
- **Force:** `required` — comes from orientation: without perceivable, unobscured focus and meaningful order, users cannot predict which control receives the next action.
- **Rule:** retain the user-agent outline or provide a tested replacement; synchronize DOM, reading, and visual order, and return or move focus only when the interaction’s state transition warrants it.
- **Implementation:** prefer `:focus-visible`, resilient tokens across backgrounds and forced colors, scroll focused elements clear of sticky regions, and restore focus after dismissals or route transitions to a logical target.
- **Exceptions:** WCAG AA does not mandate one universal ring geometry; pointer clicks need not always show the same indicator, and focus should not be moved merely to announce status.
- **Verify:** traverse forward/backward, activate and cancel overlays, trigger validation, change routes, zoom and reflow, use virtual keyboard, forced colors, reduced motion, and confirm no trap or hidden focus.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/focus-states) (editorial); [WCAG Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html); [MDN `:focus-visible`](https://developer.mozilla.org/docs/Web/CSS/:focus-visible); local accessibility policy above.

### Command Palette
- **Use when:** frequent or expert users need a fast accelerator across already discoverable commands, destinations, or objects.
- **Force:** `contextual` — comes from supplementation: a shortcut-only palette hides capability from newcomers, touch users, assistive technology, and environments where the shortcut conflicts.
- **Rule:** keep equivalent visible paths, label the search scope, expose result grouping and command consequence, and preserve a clear distinction among pending, no matches, unavailable commands, failure, and success.
- **Implementation:** choose dialog, combobox, or menu semantics according to behavior; support documented invocation, arrows, Enter, and Escape; keep async results local, reject stale responses, and return focus predictably.
- **Exceptions:** fuzzy matching, recent items, nesting, remembered queries, mobile presentation, and an always-open palette depend on privacy, command volume, frequency, and product evidence; the palette itself is optional.
- **Verify:** test shortcut collision, keyboard-only completion, touch equivalent, screen-reader names/states, empty and error recovery, nested Back/Escape, rapid queries, destructive commands, zoom, and small screens.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/command-palette) (editorial); [APG combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/); [APG dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/); local interaction and accessibility policies above.

### Filter Chips
- **Use when:** compact, directly toggled criteria improve comprehension for a small set; filtering does not require chips and may use checkboxes, selects, fields, or disclosures.
- **Force:** `contextual` — comes from explainable state: users need to perceive active criteria, combination logic, changed results, and a reliable route back to an unfiltered or previous view.
- **Rule:** give each control native or equivalent semantics, a persistent accessible name and selected state, and keep filter/query state in the URL when sharing, refresh, or history continuity matters.
- **Implementation:** update visible criteria and settled result count together, prevent stale responses from replacing newer choices, provide a scoped clear action, and preserve focus during responsive reflow or horizontal overflow.
- **Exceptions:** disabled zero-result options, sticky summaries, immediate application, wrapping, scrolling, and OR-within/AND-across logic are domain decisions; explain rather than assume them.
- **Verify:** toggle by keyboard and touch, combine groups, clear, Back/Forward, refresh, share URL, test no results versus error, slow responses, long labels, RTL, zoom, and coarse pointer.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/filter-chips) (editorial); [HTML buttons](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element); [WCAG 2.2](https://www.w3.org/TR/WCAG22/); local forms/data policy above.

### Pagination
- **Use when:** a result set needs bounded retrieval, random access, stable continuation, or user-controlled accumulation rather than one unbounded presentation.
- **Force:** `contextual` — comes from data volatility and continuity: offset pages can drift under inserts, while cursors complicate arbitrary jumps, totals, and shareable numeric locations.
- **Rule:** choose the model from the task; expose current position and navigation semantics, preserve query/filter/page or cursor state when reproducibility matters, and restore context after detail navigation.
- **Implementation:** use links for destinations, meaningful labels for previous/next and page numbers, canonical URL rules, server-consistent ordering, disabled/unavailable state that remains understandable, and recoverable fetch errors without discarding loaded content.
- **Exceptions:** numbered pages, load-more, cursor continuation, and infinite scroll are contextual; infinite scroll is never compulsory and requires footer access, stopping points, focus behavior, and return-position handling.
- **Verify:** insert/delete rows between requests, open a page directly, refresh, share, Back from detail, retry failure, use keyboard/touch/screen reader, zoom, and test first/last/unknown-total boundaries.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/pagination) (editorial); [HTML links](https://html.spec.whatwg.org/multipage/links.html); [WCAG 2.2](https://www.w3.org/TR/WCAG22/); local forms/data and interaction policies above.

### Data Table
- **Use when:** users must compare records across shared fields; use another representation when the content is primarily sequential, narrative, or action-oriented.
- **Force:** `contextual` — comes from relationships and scale: headers, units, sort, selection, row identity, and cell actions must remain understandable during horizontal/vertical movement and responsive adaptation.
- **Rule:** use native table structure where tabular relationships exist, associate headers correctly, label the table, expose sort and selection programmatically, and disclose bulk-selection scope across filters and pages.
- **Implementation:** keep stable row keys, right-align comparable numbers when useful, separate row activation from embedded controls, preserve sort/query/page in URL when expected, and surface loading, partial data, empty, and error states distinctly.
- **Exceptions:** sticky headers, frozen columns, zebra stripes, density controls, tri-state sort, card transformation, and selectable rows depend on task, content, viewport, and product conventions; two-dimensional overflow may be valid.
- **Verify:** navigate interactive cells by keyboard, inspect the accessibility tree, sort and restore, select across pages, resize/reflow, zoom, use touch, test long/RTL content, partial failures, refresh, and Back from detail.
- **Sources:** [Design Motion HQ](https://designmotionhq.com/patterns/data-table) (editorial); [HTML tables](https://html.spec.whatwg.org/multipage/tables.html); [WCAG relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html); local accessibility and forms/data policies above.
