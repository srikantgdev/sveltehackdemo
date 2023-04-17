
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function init_binding_group(group) {
        let _inputs;
        return {
            /* push */ p(...inputs) {
                _inputs = inputs;
                _inputs.forEach(input => group.push(input));
            },
            /* remove */ r() {
                _inputs.forEach(input => group.splice(group.indexOf(input), 1));
            }
        };
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.56.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    function construct_svelte_component_dev(component, props) {
        const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
        try {
            const instance = new component(props);
            if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
                throw new Error(error_message);
            }
            return instance;
        }
        catch (err) {
            const { message } = err;
            if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
                throw new Error(error_message);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/TopNav.svelte generated by Svelte v3.56.0 */

    const file$4 = "src/TopNav.svelte";

    function create_fragment$4(ctx) {
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let a;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = `${/*appTitle*/ ctx[0]}`;
    			t1 = space();
    			div1 = element("div");
    			t2 = text("Developed by ");
    			a = element("a");
    			a.textContent = "Srikant Gudi | Bengaluru, India";
    			attr_dev(div0, "class", "display-4 app-title svelte-15egi9x");
    			add_location(div0, file$4, 9, 0, 122);
    			attr_dev(a, "href", "mailto:srikantgudi@gmail.com");
    			add_location(a, file$4, 10, 18, 190);
    			add_location(div1, file$4, 10, 0, 172);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t2);
    			append_dev(div1, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TopNav', slots, []);
    	let appTitle = 'Svelte Hackathon Demo App';
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TopNav> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ appTitle });

    	$$self.$inject_state = $$props => {
    		if ('appTitle' in $$props) $$invalidate(0, appTitle = $$props.appTitle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [appTitle];
    }

    class TopNav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TopNav",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/ZoneClock.svelte generated by Svelte v3.56.0 */
    const file$3 = "src/ZoneClock.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[41] = list[i];
    	child_ctx[43] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[41] = list[i];
    	child_ctx[43] = i;
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[41] = list[i];
    	child_ctx[43] = i;
    	return child_ctx;
    }

    function get_each_context_3$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[41] = list[i];
    	child_ctx[43] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[47] = list[i];
    	child_ctx[49] = i;
    	return child_ctx;
    }

    // (130:3) {#each zones as z,zi}
    function create_each_block_4(ctx) {
    	let text_1;
    	let t_value = /*z*/ ctx[47].name + "";
    	let t;
    	let text_1_font_size_value;
    	let text_1_fill_value;
    	let mounted;
    	let dispose;

    	function keyup_handler() {
    		return /*keyup_handler*/ ctx[30](/*z*/ ctx[47]);
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[31](/*z*/ ctx[47]);
    	}

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(text_1, "x", /*zX*/ ctx[14](/*zi*/ ctx[49]));
    			attr_dev(text_1, "y", /*zY*/ ctx[15](/*zi*/ ctx[49]));
    			attr_dev(text_1, "cursor", "pointer");
    			attr_dev(text_1, "text-anchor", "middle");
    			attr_dev(text_1, "font-size", text_1_font_size_value = /*zone*/ ctx[1].name == /*z*/ ctx[47].name ? 3.8 : 3);

    			attr_dev(text_1, "fill", text_1_fill_value = /*zone*/ ctx[1].name == /*z*/ ctx[47].name
    			? 'lightblue'
    			: 'darkgrey');

    			add_location(text_1, file$3, 130, 4, 3756);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(text_1, "keyup", keyup_handler, false, false, false, false),
    					listen_dev(text_1, "click", click_handler, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*zone*/ 2 && text_1_font_size_value !== (text_1_font_size_value = /*zone*/ ctx[1].name == /*z*/ ctx[47].name ? 3.8 : 3)) {
    				attr_dev(text_1, "font-size", text_1_font_size_value);
    			}

    			if (dirty[0] & /*zone*/ 2 && text_1_fill_value !== (text_1_fill_value = /*zone*/ ctx[1].name == /*z*/ ctx[47].name
    			? 'lightblue'
    			: 'darkgrey')) {
    				attr_dev(text_1, "fill", text_1_fill_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(130:3) {#each zones as z,zi}",
    		ctx
    	});

    	return block;
    }

    // (134:3) {#each Array(60) as _, p}}
    function create_each_block_3$1(ctx) {
    	let t0;
    	let text_1;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("}\n\t\t\t\t");
    			text_1 = svg_element("text");
    			t1 = text(/*p*/ ctx[43]);
    			attr_dev(text_1, "x", /*point*/ ctx[16](/*p*/ ctx[43], 6, /*miPos*/ ctx[12]).x);
    			attr_dev(text_1, "y", /*point*/ ctx[16](/*p*/ ctx[43], 6, /*miPos*/ ctx[12]).y);
    			attr_dev(text_1, "fill", /*p*/ ctx[43] % 5 ? '#888' : '#eee');
    			attr_dev(text_1, "font-size", /*p*/ ctx[43] % 5 ? 2.2 : 3);
    			attr_dev(text_1, "text-anchor", "middle");
    			add_location(text_1, file$3, 134, 4, 4062);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3$1.name,
    		type: "each",
    		source: "(134:3) {#each Array(60) as _, p}}",
    		ctx
    	});

    	return block;
    }

    // (138:3) {#each Array(hrs) as _, p}}
    function create_each_block_2$1(ctx) {
    	let t0;
    	let text_1;
    	let t1;
    	let text_1_x_value;
    	let text_1_y_value;

    	const block = {
    		c: function create() {
    			t0 = text("}\n\t\t\t\t");
    			text_1 = svg_element("text");
    			t1 = text(/*p*/ ctx[43]);
    			attr_dev(text_1, "x", text_1_x_value = /*hrpointX*/ ctx[17](/*p*/ ctx[43], /*hourAngle*/ ctx[8][/*hrs*/ ctx[0]]));
    			attr_dev(text_1, "y", text_1_y_value = /*hrpointY*/ ctx[18](/*p*/ ctx[43], /*hourAngle*/ ctx[8][/*hrs*/ ctx[0]]));
    			attr_dev(text_1, "font-size", /*p*/ ctx[43] % 3 ? 3 : 3.5);
    			attr_dev(text_1, "text-anchor", "middle");
    			attr_dev(text_1, "fill", /*p*/ ctx[43] % 3 ? 'silver' : 'white');
    			add_location(text_1, file$3, 138, 4, 4270);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*hourAngle, hrs*/ 257 && text_1_x_value !== (text_1_x_value = /*hrpointX*/ ctx[17](/*p*/ ctx[43], /*hourAngle*/ ctx[8][/*hrs*/ ctx[0]]))) {
    				attr_dev(text_1, "x", text_1_x_value);
    			}

    			if (dirty[0] & /*hourAngle, hrs*/ 257 && text_1_y_value !== (text_1_y_value = /*hrpointY*/ ctx[18](/*p*/ ctx[43], /*hourAngle*/ ctx[8][/*hrs*/ ctx[0]]))) {
    				attr_dev(text_1, "y", text_1_y_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(138:3) {#each Array(hrs) as _, p}}",
    		ctx
    	});

    	return block;
    }

    // (155:3) {#each Array(60) as _, p}}
    function create_each_block_1$1(ctx) {
    	let t0;
    	let text_1;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("}\n\t\t\t\t");
    			text_1 = svg_element("text");
    			t1 = text(/*p*/ ctx[43]);
    			attr_dev(text_1, "x", /*point*/ ctx[16](/*p*/ ctx[43], 6, 46).x);
    			attr_dev(text_1, "y", /*point*/ ctx[16](/*p*/ ctx[43], 6, 46).y);
    			attr_dev(text_1, "fill", /*p*/ ctx[43] % 5 ? '#888' : '#eee');
    			attr_dev(text_1, "font-size", /*p*/ ctx[43] % 5 ? 3 : 4);
    			attr_dev(text_1, "text-anchor", "middle");
    			add_location(text_1, file$3, 155, 4, 5211);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(155:3) {#each Array(60) as _, p}}",
    		ctx
    	});

    	return block;
    }

    // (159:3) {#each Array(hrs) as _, p}}
    function create_each_block$3(ctx) {
    	let t0;
    	let text_1;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("}\n\t\t\t\t");
    			text_1 = svg_element("text");
    			t1 = text(/*p*/ ctx[43]);
    			attr_dev(text_1, "x", /*hrpointX*/ ctx[17](/*p*/ ctx[43], 30));
    			attr_dev(text_1, "y", /*hrpointY*/ ctx[18](/*p*/ ctx[43], 30));
    			attr_dev(text_1, "font-size", /*p*/ ctx[43] % 3 ? 3 : 3.5);
    			attr_dev(text_1, "text-anchor", "middle");
    			attr_dev(text_1, "fill", 'silver');
    			add_location(text_1, file$3, 159, 4, 5411);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(159:3) {#each Array(hrs) as _, p}}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let h5;
    	let t3;
    	let div1;
    	let input0;
    	let t4;
    	let label0;
    	let t6;
    	let input1;
    	let t7;
    	let label1;
    	let t9;
    	let div5;
    	let div3;
    	let h4;
    	let t10_value = /*zone*/ ctx[1].name + "";
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let svg0;
    	let circle0;
    	let circle1;
    	let circle2;
    	let each0_anchor;
    	let each1_anchor;
    	let line;
    	let line_transform_value;
    	let polyline0;
    	let polyline0_transform_value;
    	let polyline1;
    	let polyline1_transform_value;
    	let t14;
    	let div4;
    	let h6;
    	let t15;
    	let t16;
    	let t17;
    	let svg1;
    	let circle3;
    	let each3_anchor;
    	let rect0;
    	let rect0_transform_value;
    	let rect1;
    	let rect1_transform_value;
    	let binding_group;
    	let mounted;
    	let dispose;
    	let each_value_4 = /*zones*/ ctx[11];
    	validate_each_argument(each_value_4);
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = Array(60);
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3$1(get_each_context_3$1(ctx, each_value_3, i));
    	}

    	let each_value_2 = Array(/*hrs*/ ctx[0]);
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	let each_value_1 = Array(60);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = Array(/*hrs*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	binding_group = init_binding_group(/*$$binding_groups*/ ctx[28][0]);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Zone Clock »";
    			t1 = space();
    			h5 = element("h5");
    			h5.textContent = "Select hrs »";
    			t3 = space();
    			div1 = element("div");
    			input0 = element("input");
    			t4 = space();
    			label0 = element("label");
    			label0.textContent = "12";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			label1 = element("label");
    			label1.textContent = "24";
    			t9 = space();
    			div5 = element("div");
    			div3 = element("div");
    			h4 = element("h4");
    			t10 = text(t10_value);
    			t11 = text(": ");
    			t12 = text(/*zoneTime*/ ctx[2]);
    			t13 = space();
    			svg0 = svg_element("svg");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			each1_anchor = empty();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			line = svg_element("line");
    			polyline0 = svg_element("polyline");
    			polyline1 = svg_element("polyline");
    			t14 = space();
    			div4 = element("div");
    			h6 = element("h6");
    			t15 = text("Local: ");
    			t16 = text(/*currentTime*/ ctx[3]);
    			t17 = space();
    			svg1 = svg_element("svg");
    			circle3 = svg_element("circle");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each3_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			attr_dev(div0, "class", "section-title mx-2");
    			add_location(div0, file$3, 106, 1, 2889);
    			attr_dev(h5, "class", "mx-4");
    			add_location(h5, file$3, 109, 1, 2953);
    			attr_dev(input0, "type", "radio");
    			attr_dev(input0, "class", "btn-check");
    			attr_dev(input0, "name", "options");
    			attr_dev(input0, "id", "option1");
    			attr_dev(input0, "autocomplete", "off");
    			input0.__value = 12;
    			input0.value = input0.__value;
    			add_location(input0, file$3, 111, 2, 3021);
    			attr_dev(label0, "class", "btn btn-secondary");
    			attr_dev(label0, "for", "option1");
    			add_location(label0, file$3, 112, 2, 3139);
    			attr_dev(input1, "type", "radio");
    			attr_dev(input1, "class", "btn-check");
    			attr_dev(input1, "name", "options");
    			attr_dev(input1, "id", "option2");
    			attr_dev(input1, "autocomplete", "off");
    			input1.__value = 24;
    			input1.value = input1.__value;
    			add_location(input1, file$3, 113, 2, 3199);
    			attr_dev(label1, "class", "btn btn-secondary");
    			attr_dev(label1, "for", "option2");
    			add_location(label1, file$3, 114, 2, 3316);
    			attr_dev(div1, "class", "btn-group");
    			add_location(div1, file$3, 110, 1, 2995);
    			attr_dev(div2, "class", "d-flex align-items-center justify-content-center m-3");
    			add_location(div2, file$3, 105, 0, 2821);
    			attr_dev(h4, "class", "text-center");
    			add_location(h4, file$3, 120, 2, 3447);
    			attr_dev(circle0, "r", 49);
    			attr_dev(circle0, "fill", "#003");
    			add_location(circle0, file$3, 122, 3, 3549);
    			attr_dev(circle1, "r", 35);
    			add_location(circle1, file$3, 124, 3, 3608);
    			attr_dev(circle2, "r", 25);
    			attr_dev(circle2, "fill", "darkslategrey");
    			add_location(circle2, file$3, 126, 3, 3659);
    			attr_dev(line, "x1", "-4");
    			attr_dev(line, "x2", "28");
    			attr_dev(line, "class", "hand svelte-hhy4rw");
    			attr_dev(line, "stroke", "lightblue");
    			attr_dev(line, "stroke-width", "0.4");
    			attr_dev(line, "transform", line_transform_value = `rotate(${/*secondsAngle*/ ctx[6]})`);
    			add_location(line, file$3, 141, 3, 4461);
    			attr_dev(polyline0, "class", "hand svelte-hhy4rw");
    			attr_dev(polyline0, "points", "-6,0 4,-0.5 " + (/*hrPos*/ ctx[13] - 2) + ",0 4,0.5 -6,0");
    			attr_dev(polyline0, "fill", "transparent");
    			attr_dev(polyline0, "stroke", /*zoneHandClr*/ ctx[10]);
    			attr_dev(polyline0, "stroke-width", "0.3");
    			attr_dev(polyline0, "transform", polyline0_transform_value = `rotate(${/*zoneHrAngle*/ ctx[5]})`);
    			add_location(polyline0, file$3, 144, 3, 4622);
    			attr_dev(polyline1, "class", "hand svelte-hhy4rw");
    			attr_dev(polyline1, "points", "-8,0 4,-0.5 " + (/*miPos*/ ctx[12] - 2) + ",0 4,0.5 -8,0");
    			attr_dev(polyline1, "fill", "transparent");
    			attr_dev(polyline1, "stroke", /*zoneHandClr*/ ctx[10]);
    			attr_dev(polyline1, "stroke-width", "0.4");
    			attr_dev(polyline1, "transform", polyline1_transform_value = `rotate(${/*zoneMinuteAngle*/ ctx[4]})`);
    			add_location(polyline1, file$3, 146, 3, 4814);
    			attr_dev(svg0, "width", 600);
    			attr_dev(svg0, "viewBox", "-50 -50 100 100");
    			add_location(svg0, file$3, 121, 2, 3502);
    			attr_dev(div3, "class", "col col-md-6 offset-2");
    			add_location(div3, file$3, 119, 1, 3409);
    			set_style(h6, "color", "#999");
    			add_location(h6, file$3, 150, 2, 5031);
    			attr_dev(circle3, "r", 49);
    			attr_dev(circle3, "fill", "");
    			add_location(circle3, file$3, 152, 3, 5118);
    			attr_dev(rect0, "rx", 4);
    			attr_dev(rect0, "class", "hand svelte-hhy4rw");
    			attr_dev(rect0, "x", "-8");
    			attr_dev(rect0, "width", 30);
    			attr_dev(rect0, "height", 1);
    			attr_dev(rect0, "fill", "transparent");
    			attr_dev(rect0, "stroke", /*localHandClr*/ ctx[9]);
    			attr_dev(rect0, "stroke-width", 0.4);
    			attr_dev(rect0, "stroke-linecap", "round");
    			attr_dev(rect0, "transform", rect0_transform_value = `rotate(${/*hourAngle*/ ctx[8]})`);
    			add_location(rect0, file$3, 162, 3, 5561);
    			attr_dev(rect1, "rx", 4);
    			attr_dev(rect1, "class", "hand svelte-hhy4rw");
    			attr_dev(rect1, "x", "-8");
    			attr_dev(rect1, "width", 46);
    			attr_dev(rect1, "height", 1);
    			attr_dev(rect1, "fill", "transparent");
    			attr_dev(rect1, "stroke", /*localHandClr*/ ctx[9]);
    			attr_dev(rect1, "stroke-width", 0.3);
    			attr_dev(rect1, "stroke-linecap", "round");
    			attr_dev(rect1, "transform", rect1_transform_value = `rotate(${/*minuteAngle*/ ctx[7]})`);
    			add_location(rect1, file$3, 164, 3, 5763);
    			attr_dev(svg1, "viewBox", "-50 -50 100 100");
    			add_location(svg1, file$3, 151, 2, 5083);
    			attr_dev(div4, "class", "col col-md-2");
    			add_location(div4, file$3, 149, 1, 5002);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$3, 118, 0, 3390);
    			binding_group.p(input0, input1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, h5);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, input0);
    			input0.checked = input0.__value === /*hrs*/ ctx[0];
    			append_dev(div1, t4);
    			append_dev(div1, label0);
    			append_dev(div1, t6);
    			append_dev(div1, input1);
    			input1.checked = input1.__value === /*hrs*/ ctx[0];
    			append_dev(div1, t7);
    			append_dev(div1, label1);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div3);
    			append_dev(div3, h4);
    			append_dev(h4, t10);
    			append_dev(h4, t11);
    			append_dev(h4, t12);
    			append_dev(div3, t13);
    			append_dev(div3, svg0);
    			append_dev(svg0, circle0);
    			append_dev(svg0, circle1);
    			append_dev(svg0, circle2);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				if (each_blocks_4[i]) {
    					each_blocks_4[i].m(svg0, null);
    				}
    			}

    			append_dev(svg0, each0_anchor);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				if (each_blocks_3[i]) {
    					each_blocks_3[i].m(svg0, null);
    				}
    			}

    			append_dev(svg0, each1_anchor);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(svg0, null);
    				}
    			}

    			append_dev(svg0, line);
    			append_dev(svg0, polyline0);
    			append_dev(svg0, polyline1);
    			append_dev(div5, t14);
    			append_dev(div5, div4);
    			append_dev(div4, h6);
    			append_dev(h6, t15);
    			append_dev(h6, t16);
    			append_dev(div4, t17);
    			append_dev(div4, svg1);
    			append_dev(svg1, circle3);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(svg1, null);
    				}
    			}

    			append_dev(svg1, each3_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(svg1, null);
    				}
    			}

    			append_dev(svg1, rect0);
    			append_dev(svg1, rect1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[27]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[29])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*hrs*/ 1) {
    				input0.checked = input0.__value === /*hrs*/ ctx[0];
    			}

    			if (dirty[0] & /*hrs*/ 1) {
    				input1.checked = input1.__value === /*hrs*/ ctx[0];
    			}

    			if (dirty[0] & /*zone*/ 2 && t10_value !== (t10_value = /*zone*/ ctx[1].name + "")) set_data_dev(t10, t10_value);
    			if (dirty[0] & /*zoneTime*/ 4) set_data_dev(t12, /*zoneTime*/ ctx[2]);

    			if (dirty[0] & /*zX, zY, zone, zones, setZone*/ 575490) {
    				each_value_4 = /*zones*/ ctx[11];
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_4(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(svg0, each0_anchor);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_4.length;
    			}

    			if (dirty[0] & /*point, miPos*/ 69632) {
    				each_value_3 = Array(60);
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3$1(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3$1(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(svg0, each1_anchor);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty[0] & /*hrpointX, hourAngle, hrs, hrpointY*/ 393473) {
    				each_value_2 = Array(/*hrs*/ ctx[0]);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2$1(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(svg0, line);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*secondsAngle*/ 64 && line_transform_value !== (line_transform_value = `rotate(${/*secondsAngle*/ ctx[6]})`)) {
    				attr_dev(line, "transform", line_transform_value);
    			}

    			if (dirty[0] & /*zoneHrAngle*/ 32 && polyline0_transform_value !== (polyline0_transform_value = `rotate(${/*zoneHrAngle*/ ctx[5]})`)) {
    				attr_dev(polyline0, "transform", polyline0_transform_value);
    			}

    			if (dirty[0] & /*zoneMinuteAngle*/ 16 && polyline1_transform_value !== (polyline1_transform_value = `rotate(${/*zoneMinuteAngle*/ ctx[4]})`)) {
    				attr_dev(polyline1, "transform", polyline1_transform_value);
    			}

    			if (dirty[0] & /*currentTime*/ 8) set_data_dev(t16, /*currentTime*/ ctx[3]);

    			if (dirty[0] & /*point*/ 65536) {
    				each_value_1 = Array(60);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(svg1, each3_anchor);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*hrpointX, hrpointY, hrs*/ 393217) {
    				each_value = Array(/*hrs*/ ctx[0]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg1, rect0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*hourAngle*/ 256 && rect0_transform_value !== (rect0_transform_value = `rotate(${/*hourAngle*/ ctx[8]})`)) {
    				attr_dev(rect0, "transform", rect0_transform_value);
    			}

    			if (dirty[0] & /*minuteAngle*/ 128 && rect1_transform_value !== (rect1_transform_value = `rotate(${/*minuteAngle*/ ctx[7]})`)) {
    				attr_dev(rect1, "transform", rect1_transform_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div5);
    			destroy_each(each_blocks_4, detaching);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			binding_group.r();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let dtHr;
    	let dtMi;
    	let dtSe;
    	let zoneHr;
    	let zoneMi;
    	let hourAngle;
    	let minuteAngle;
    	let secondsAngle;
    	let zoneHrAngle;
    	let zoneMinuteAngle;
    	let zoneAngle;
    	let currentTime;
    	let zoneTime;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ZoneClock', slots, []);
    	let hrs = 12;
    	let selectedZoneIdx = 0;
    	let dt = new Date();
    	let zoneDt = new Date();
    	let localHandClr = 'silver';
    	let zoneHandClr = 'cyan';
    	const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    	const months = [
    		'Jan',
    		'Feb',
    		'Mar',
    		'Apr',
    		'May',
    		'Jun',
    		'Jul',
    		'Aug',
    		'Sep',
    		'Oct',
    		'Nov',
    		'Dec'
    	];

    	const zones = [
    		{
    			name: 'Los Angeles',
    			val: 'America/Los_Angeles'
    		},
    		{ name: 'US-Central', val: 'US/Central' },
    		{
    			name: 'New York',
    			val: 'America/New_York'
    		},
    		{ name: 'London', val: 'Europe/London' },
    		{ name: 'Paris', val: 'Europe/Paris' },
    		{ name: 'Lisbon', val: 'Europe/Lisbon' },
    		{ name: 'Moscow', val: 'Europe/Moscow' },
    		{ name: 'Kolkata', val: 'Asia/Kolkata' },
    		{ name: 'Tokyo', val: 'Asia/Tokyo' },
    		{ name: 'Sydney', val: 'Australia/Sydney' },
    		{ name: 'Perth', val: 'Australia/Perth' },
    		{
    			name: 'Auckland',
    			val: 'Pacific/Auckland'
    		}
    	];

    	let zone = zones[0];
    	let hrsang = { 12: 30, 24: 15 };
    	let zonePos = 41.5;
    	let miPos = 31;
    	let hrPos = 20;
    	const zfill = (n, m = 2) => (n + Math.pow(10, m)).toString().slice(1);
    	const dtFmt = d => `${weekdays[d.getDay()]} ${zfill(d.getDate())}-${months[d.getMonth()]} ${zfill(d.getHours())}:${zfill(d.getMinutes())}:${zfill(d.getSeconds())}`;

    	const zX = zi => {
    		const rad = (zi * zoneAngle - 90) * Math.PI / 180;
    		return Math.cos(rad) * zonePos;
    	};

    	const zY = zi => {
    		const rad = (zi * zoneAngle - 90) * Math.PI / 180;
    		return Math.sin(rad) * zonePos;
    	};

    	// return zone name after the '/'
    	const zoneName = idx => zones[idx].slice(zones[idx].indexOf('/') + 1).replaceAll('_', ' ');

    	const point = (p, ang, len) => {
    		const rad = (p * ang - 90) * Math.PI / 180;

    		return {
    			x: Math.cos(rad) * len,
    			y: Math.sin(rad) * len + 1
    		};
    	};

    	const hrpointX = (p, len = hrPos) => {
    		const rad = (p * hrsang[hrs] - 90) * Math.PI / 180;
    		return Math.cos(rad) * len;
    	};

    	const hrpointY = (p, len = hrPos) => {
    		const rad = (p * hrsang[hrs] - 90) * Math.PI / 180;
    		return Math.sin(rad) * len;
    	};

    	const setZone = z => {
    		$$invalidate(1, zone = z);
    	};

    	onMount(() => {
    		setInterval(
    			() => {
    				$$invalidate(20, dt = new Date());
    				$$invalidate(21, zoneDt = new Date(dt.toLocaleString('en-US', { timeZone: zone.val })));
    			},
    			1000
    		);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ZoneClock> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input0_change_handler() {
    		hrs = this.__value;
    		$$invalidate(0, hrs);
    	}

    	function input1_change_handler() {
    		hrs = this.__value;
    		$$invalidate(0, hrs);
    	}

    	const keyup_handler = z => setZone(z);
    	const click_handler = z => setZone(z);

    	$$self.$capture_state = () => ({
    		onMount,
    		hrs,
    		selectedZoneIdx,
    		dt,
    		zoneDt,
    		localHandClr,
    		zoneHandClr,
    		weekdays,
    		months,
    		zones,
    		zone,
    		hrsang,
    		zonePos,
    		miPos,
    		hrPos,
    		zfill,
    		dtFmt,
    		zX,
    		zY,
    		zoneName,
    		point,
    		hrpointX,
    		hrpointY,
    		setZone,
    		zoneAngle,
    		zoneTime,
    		currentTime,
    		dtSe,
    		zoneMi,
    		zoneMinuteAngle,
    		zoneHr,
    		zoneHrAngle,
    		secondsAngle,
    		dtMi,
    		minuteAngle,
    		dtHr,
    		hourAngle
    	});

    	$$self.$inject_state = $$props => {
    		if ('hrs' in $$props) $$invalidate(0, hrs = $$props.hrs);
    		if ('selectedZoneIdx' in $$props) selectedZoneIdx = $$props.selectedZoneIdx;
    		if ('dt' in $$props) $$invalidate(20, dt = $$props.dt);
    		if ('zoneDt' in $$props) $$invalidate(21, zoneDt = $$props.zoneDt);
    		if ('localHandClr' in $$props) $$invalidate(9, localHandClr = $$props.localHandClr);
    		if ('zoneHandClr' in $$props) $$invalidate(10, zoneHandClr = $$props.zoneHandClr);
    		if ('zone' in $$props) $$invalidate(1, zone = $$props.zone);
    		if ('hrsang' in $$props) $$invalidate(36, hrsang = $$props.hrsang);
    		if ('zonePos' in $$props) zonePos = $$props.zonePos;
    		if ('miPos' in $$props) $$invalidate(12, miPos = $$props.miPos);
    		if ('hrPos' in $$props) $$invalidate(13, hrPos = $$props.hrPos);
    		if ('zoneAngle' in $$props) zoneAngle = $$props.zoneAngle;
    		if ('zoneTime' in $$props) $$invalidate(2, zoneTime = $$props.zoneTime);
    		if ('currentTime' in $$props) $$invalidate(3, currentTime = $$props.currentTime);
    		if ('dtSe' in $$props) $$invalidate(22, dtSe = $$props.dtSe);
    		if ('zoneMi' in $$props) $$invalidate(23, zoneMi = $$props.zoneMi);
    		if ('zoneMinuteAngle' in $$props) $$invalidate(4, zoneMinuteAngle = $$props.zoneMinuteAngle);
    		if ('zoneHr' in $$props) $$invalidate(24, zoneHr = $$props.zoneHr);
    		if ('zoneHrAngle' in $$props) $$invalidate(5, zoneHrAngle = $$props.zoneHrAngle);
    		if ('secondsAngle' in $$props) $$invalidate(6, secondsAngle = $$props.secondsAngle);
    		if ('dtMi' in $$props) $$invalidate(25, dtMi = $$props.dtMi);
    		if ('minuteAngle' in $$props) $$invalidate(7, minuteAngle = $$props.minuteAngle);
    		if ('dtHr' in $$props) $$invalidate(26, dtHr = $$props.dtHr);
    		if ('hourAngle' in $$props) $$invalidate(8, hourAngle = $$props.hourAngle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*dt*/ 1048576) {
    			$$invalidate(26, dtHr = dt.getHours());
    		}

    		if ($$self.$$.dirty[0] & /*dt*/ 1048576) {
    			$$invalidate(25, dtMi = dt.getMinutes());
    		}

    		if ($$self.$$.dirty[0] & /*dt*/ 1048576) {
    			$$invalidate(22, dtSe = dt.getSeconds());
    		}

    		if ($$self.$$.dirty[0] & /*zoneDt*/ 2097152) {
    			$$invalidate(24, zoneHr = zoneDt.getHours());
    		}

    		if ($$self.$$.dirty[0] & /*zoneDt*/ 2097152) {
    			$$invalidate(23, zoneMi = zoneDt.getMinutes());
    		}

    		if ($$self.$$.dirty[0] & /*dtHr, hrs, dtMi*/ 100663297) {
    			$$invalidate(8, hourAngle = dtHr * hrsang[hrs] + dtMi / 2 - 90);
    		}

    		if ($$self.$$.dirty[0] & /*dtMi, dtSe*/ 37748736) {
    			$$invalidate(7, minuteAngle = dtMi * 6 + dtSe / 10 - 90);
    		}

    		if ($$self.$$.dirty[0] & /*dtSe*/ 4194304) {
    			$$invalidate(6, secondsAngle = dtSe * 6 - 90);
    		}

    		if ($$self.$$.dirty[0] & /*zoneHr, hrs, zoneMi*/ 25165825) {
    			// zone angles
    			$$invalidate(5, zoneHrAngle = zoneHr * hrsang[hrs] + zoneMi / 2 - 90);
    		}

    		if ($$self.$$.dirty[0] & /*zoneMi, dtSe*/ 12582912) {
    			$$invalidate(4, zoneMinuteAngle = zoneMi * 6 + dtSe / 10 - 90);
    		}

    		if ($$self.$$.dirty[0] & /*dt*/ 1048576) {
    			$$invalidate(3, currentTime = dtFmt(dt));
    		}

    		if ($$self.$$.dirty[0] & /*zoneDt*/ 2097152) {
    			$$invalidate(2, zoneTime = dtFmt(zoneDt));
    		}
    	};

    	zoneAngle = 360 / zones.length;

    	return [
    		hrs,
    		zone,
    		zoneTime,
    		currentTime,
    		zoneMinuteAngle,
    		zoneHrAngle,
    		secondsAngle,
    		minuteAngle,
    		hourAngle,
    		localHandClr,
    		zoneHandClr,
    		zones,
    		miPos,
    		hrPos,
    		zX,
    		zY,
    		point,
    		hrpointX,
    		hrpointY,
    		setZone,
    		dt,
    		zoneDt,
    		dtSe,
    		zoneMi,
    		zoneHr,
    		dtMi,
    		dtHr,
    		input0_change_handler,
    		$$binding_groups,
    		input1_change_handler,
    		keyup_handler,
    		click_handler
    	];
    }

    class ZoneClock extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ZoneClock",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/RadialCal.svelte generated by Svelte v3.56.0 */
    const file$2 = "src/RadialCal.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	child_ctx[35] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	child_ctx[38] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[39] = list[i];
    	child_ctx[41] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[42] = list[i];
    	child_ctx[44] = i;
    	return child_ctx;
    }

    // (125:3) {#each textPos(44,20) as y,yi}
    function create_each_block_3(ctx) {
    	let g;
    	let rect;
    	let text_1;
    	let t_value = /*startYear*/ ctx[4] + /*yi*/ ctx[44] + "";
    	let t;
    	let text_1_font_size_value;
    	let text_1_fill_value;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[23](/*yi*/ ctx[44]);
    	}

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			rect = svg_element("rect");
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(rect, "x", /*y*/ ctx[42].x - 4);
    			attr_dev(rect, "y", /*y*/ ctx[42].y - 3);
    			attr_dev(rect, "rx", 1);
    			attr_dev(rect, "width", 8);
    			attr_dev(rect, "height", 4);
    			attr_dev(rect, "fill", "aliceblue");
    			attr_dev(rect, "stroke", "cyan");
    			attr_dev(rect, "stroke-width", "0.3");
    			add_location(rect, file$2, 126, 5, 3189);
    			attr_dev(text_1, "x", /*y*/ ctx[42].x);
    			attr_dev(text_1, "y", /*y*/ ctx[42].y);

    			attr_dev(text_1, "font-size", text_1_font_size_value = /*currentYear*/ ctx[2] === /*yi*/ ctx[44] + /*startYear*/ ctx[4]
    			? 3
    			: 2.2);

    			attr_dev(text_1, "fill", text_1_fill_value = /*currentYear*/ ctx[2] === /*yi*/ ctx[44] + /*startYear*/ ctx[4]
    			? 'blue'
    			: 'darkslate');

    			attr_dev(text_1, "text-anchor", "middle");
    			add_location(text_1, file$2, 127, 5, 3301);
    			attr_dev(g, "cursor", "pointer");
    			add_location(g, file$2, 125, 4, 3080);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, rect);
    			append_dev(g, text_1);
    			append_dev(text_1, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(g, "keyup", /*keyup_handler*/ ctx[22], false, false, false, false),
    					listen_dev(g, "click", click_handler_3, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*startYear*/ 16 && t_value !== (t_value = /*startYear*/ ctx[4] + /*yi*/ ctx[44] + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*currentYear, startYear*/ 20 && text_1_font_size_value !== (text_1_font_size_value = /*currentYear*/ ctx[2] === /*yi*/ ctx[44] + /*startYear*/ ctx[4]
    			? 3
    			: 2.2)) {
    				attr_dev(text_1, "font-size", text_1_font_size_value);
    			}

    			if (dirty[0] & /*currentYear, startYear*/ 20 && text_1_fill_value !== (text_1_fill_value = /*currentYear*/ ctx[2] === /*yi*/ ctx[44] + /*startYear*/ ctx[4]
    			? 'blue'
    			: 'darkslate')) {
    				attr_dev(text_1, "fill", text_1_fill_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(125:3) {#each textPos(44,20) as y,yi}",
    		ctx
    	});

    	return block;
    }

    // (133:3) {#each textPos(monthPos, 12) as m, mIdx}
    function create_each_block_2(ctx) {
    	let text_1;
    	let t_value = /*months*/ ctx[8][/*m*/ ctx[39].val] + "";
    	let t;
    	let text_1_font_size_value;
    	let text_1_font_weight_value;
    	let text_1_fill_value;
    	let mounted;
    	let dispose;

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[24](/*mIdx*/ ctx[41]);
    	}

    	function keyup_handler_1() {
    		return /*keyup_handler_1*/ ctx[25](/*mIdx*/ ctx[41]);
    	}

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(text_1, "class", "txt svelte-9ubt5m");
    			attr_dev(text_1, "x", /*m*/ ctx[39].x);
    			attr_dev(text_1, "y", /*m*/ ctx[39].y);
    			attr_dev(text_1, "font-size", text_1_font_size_value = /*mIdx*/ ctx[41] === /*currentMonth*/ ctx[1] ? 4 : 3);
    			attr_dev(text_1, "font-weight", text_1_font_weight_value = /*mIdx*/ ctx[41] === /*currentMonth*/ ctx[1] ? 600 : 400);

    			attr_dev(text_1, "fill", text_1_fill_value = /*mIdx*/ ctx[41] === /*currentMonth*/ ctx[1]
    			? 'skyblue'
    			: '#ddd');

    			add_location(text_1, file$2, 133, 3, 3570);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(text_1, "click", click_handler_4, false, false, false, false),
    					listen_dev(text_1, "keyup", keyup_handler_1, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*currentMonth*/ 2 && text_1_font_size_value !== (text_1_font_size_value = /*mIdx*/ ctx[41] === /*currentMonth*/ ctx[1] ? 4 : 3)) {
    				attr_dev(text_1, "font-size", text_1_font_size_value);
    			}

    			if (dirty[0] & /*currentMonth*/ 2 && text_1_font_weight_value !== (text_1_font_weight_value = /*mIdx*/ ctx[41] === /*currentMonth*/ ctx[1] ? 600 : 400)) {
    				attr_dev(text_1, "font-weight", text_1_font_weight_value);
    			}

    			if (dirty[0] & /*currentMonth*/ 2 && text_1_fill_value !== (text_1_fill_value = /*mIdx*/ ctx[41] === /*currentMonth*/ ctx[1]
    			? 'skyblue'
    			: '#ddd')) {
    				attr_dev(text_1, "fill", text_1_fill_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(133:3) {#each textPos(monthPos, 12) as m, mIdx}",
    		ctx
    	});

    	return block;
    }

    // (143:3) {#each days as d, di}
    function create_each_block_1(ctx) {
    	let text_1;
    	let t_value = /*d*/ ctx[36].val + 1 + "";
    	let t;
    	let text_1_x_value;
    	let text_1_y_value;
    	let text_1_font_size_value;
    	let text_1_font_weight_value;
    	let text_1_fill_value;
    	let mounted;
    	let dispose;

    	function click_handler_5() {
    		return /*click_handler_5*/ ctx[26](/*di*/ ctx[38]);
    	}

    	function keyup_handler_2() {
    		return /*keyup_handler_2*/ ctx[27](/*di*/ ctx[38]);
    	}

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(text_1, "class", "txt svelte-9ubt5m");
    			attr_dev(text_1, "x", text_1_x_value = /*d*/ ctx[36].x);
    			attr_dev(text_1, "y", text_1_y_value = /*d*/ ctx[36].y);
    			attr_dev(text_1, "text-anchor", "middle");
    			attr_dev(text_1, "font-size", text_1_font_size_value = /*di*/ ctx[38] + 1 === /*dt*/ ctx[0].getDate() ? 5 : 3);

    			attr_dev(text_1, "font-weight", text_1_font_weight_value = /*di*/ ctx[38] + 1 === /*dt*/ ctx[0].getDate()
    			? 600
    			: 400);

    			attr_dev(text_1, "fill", text_1_fill_value = /*di*/ ctx[38] + 1 === /*dt*/ ctx[0].getDate()
    			? 'cyan'
    			: 'lightblue');

    			add_location(text_1, file$2, 143, 3, 3961);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(text_1, "click", click_handler_5, false, false, false, false),
    					listen_dev(text_1, "keyup", keyup_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*days*/ 8 && t_value !== (t_value = /*d*/ ctx[36].val + 1 + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*days*/ 8 && text_1_x_value !== (text_1_x_value = /*d*/ ctx[36].x)) {
    				attr_dev(text_1, "x", text_1_x_value);
    			}

    			if (dirty[0] & /*days*/ 8 && text_1_y_value !== (text_1_y_value = /*d*/ ctx[36].y)) {
    				attr_dev(text_1, "y", text_1_y_value);
    			}

    			if (dirty[0] & /*dt*/ 1 && text_1_font_size_value !== (text_1_font_size_value = /*di*/ ctx[38] + 1 === /*dt*/ ctx[0].getDate() ? 5 : 3)) {
    				attr_dev(text_1, "font-size", text_1_font_size_value);
    			}

    			if (dirty[0] & /*dt*/ 1 && text_1_font_weight_value !== (text_1_font_weight_value = /*di*/ ctx[38] + 1 === /*dt*/ ctx[0].getDate()
    			? 600
    			: 400)) {
    				attr_dev(text_1, "font-weight", text_1_font_weight_value);
    			}

    			if (dirty[0] & /*dt*/ 1 && text_1_fill_value !== (text_1_fill_value = /*di*/ ctx[38] + 1 === /*dt*/ ctx[0].getDate()
    			? 'cyan'
    			: 'lightblue')) {
    				attr_dev(text_1, "fill", text_1_fill_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(143:3) {#each days as d, di}",
    		ctx
    	});

    	return block;
    }

    // (158:3) {#each textPos(14,7) as w, wi}
    function create_each_block$2(ctx) {
    	let text_1;
    	let t_value = /*weekdays*/ ctx[9][/*w*/ ctx[33].val] + "";
    	let t;
    	let text_1_font_weight_value;
    	let text_1_font_size_value;

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(text_1, "x", /*w*/ ctx[33].x);
    			attr_dev(text_1, "y", /*w*/ ctx[33].y);
    			attr_dev(text_1, "fill", "skyblue");
    			attr_dev(text_1, "text-anchor", "middle");
    			attr_dev(text_1, "font-weight", text_1_font_weight_value = /*wi*/ ctx[35] === /*dt*/ ctx[0].getDay() ? 600 : 400);
    			attr_dev(text_1, "font-size", text_1_font_size_value = /*wi*/ ctx[35] === /*dt*/ ctx[0].getDay() ? 4 : 3);
    			add_location(text_1, file$2, 158, 3, 4631);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*dt*/ 1 && text_1_font_weight_value !== (text_1_font_weight_value = /*wi*/ ctx[35] === /*dt*/ ctx[0].getDay() ? 600 : 400)) {
    				attr_dev(text_1, "font-weight", text_1_font_weight_value);
    			}

    			if (dirty[0] & /*dt*/ 1 && text_1_font_size_value !== (text_1_font_size_value = /*wi*/ ctx[35] === /*dt*/ ctx[0].getDay() ? 4 : 3)) {
    				attr_dev(text_1, "font-size", text_1_font_size_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(158:3) {#each textPos(14,7) as w, wi}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let span;
    	let t1_value = /*months*/ ctx[8][/*currentMonth*/ ctx[1]] + "";
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let button0;
    	let t6;
    	let button1;
    	let i0;
    	let t7;
    	let t8;
    	let button2;
    	let t9;
    	let i1;
    	let t10;
    	let div2;
    	let svg;
    	let circle0;
    	let circle1;
    	let circle2;
    	let circle3;
    	let each0_anchor;
    	let each1_anchor;
    	let polyline0;
    	let polyline0_transform_value;
    	let polyline1;
    	let polyline1_transform_value;
    	let polyline2;
    	let polyline2_transform_value;
    	let mounted;
    	let dispose;
    	let each_value_3 = /*textPos*/ ctx[13](44, 20);
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*textPos*/ ctx[13](/*monthPos*/ ctx[10], 12);
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*days*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*textPos*/ ctx[13](14, 7);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = text("Radial Calendar: ");
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			t3 = text(/*currentYear*/ ctx[2]);
    			t4 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Today";
    			t6 = space();
    			button1 = element("button");
    			i0 = element("i");
    			t7 = text(" Back 20 years");
    			t8 = space();
    			button2 = element("button");
    			t9 = text("Next 20 years ");
    			i1 = element("i");
    			t10 = space();
    			div2 = element("div");
    			svg = svg_element("svg");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");
    			circle3 = svg_element("circle");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			each1_anchor = empty();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			polyline0 = svg_element("polyline");
    			polyline1 = svg_element("polyline");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			polyline2 = svg_element("polyline");
    			set_style(span, "font-size", "1.4rem");
    			add_location(span, file$2, 109, 19, 2246);
    			attr_dev(div0, "class", "section-title text-center");
    			add_location(div0, file$2, 108, 1, 2187);
    			attr_dev(button0, "class", "btn btn-secondary bg-gradient");
    			attr_dev(button0, "data-mdb-ripple-color", "info");
    			add_location(button0, file$2, 113, 2, 2371);
    			attr_dev(i0, "class", "fas fa-angle-double-left fa-lg");
    			add_location(i0, file$2, 114, 112, 2601);
    			attr_dev(button1, "class", "btn btn-secondary bg-gradient");
    			attr_dev(button1, "data-mdb-ripple-color", "info");
    			add_location(button1, file$2, 114, 2, 2491);
    			attr_dev(i1, "class", "fas fa-angle-double-right fa-lg");
    			add_location(i1, file$2, 115, 125, 2796);
    			attr_dev(button2, "class", "btn btn-secondary bg-gradient");
    			attr_dev(button2, "data-mdb-ripple-color", "info");
    			add_location(button2, file$2, 115, 2, 2673);
    			attr_dev(div1, "class", "mm-yy p-1 text-center svelte-9ubt5m");
    			add_location(div1, file$2, 112, 1, 2333);
    			attr_dev(circle0, "r", 50);
    			add_location(circle0, file$2, 119, 3, 2905);
    			attr_dev(circle1, "r", 39);
    			attr_dev(circle1, "fill", "darkslategrey");
    			add_location(circle1, file$2, 120, 3, 2926);
    			attr_dev(circle2, "r", 31);
    			attr_dev(circle2, "fill", "#666");
    			add_location(circle2, file$2, 121, 3, 2968);
    			attr_dev(circle3, "r", 20);
    			add_location(circle3, file$2, 122, 3, 3001);
    			attr_dev(polyline0, "class", "hand");
    			attr_dev(polyline0, "fill", "lightblue");
    			attr_dev(polyline0, "points", "18,-2 22,0 18,2 20,0");
    			attr_dev(polyline0, "transform", polyline0_transform_value = `rotate(${/*dateAng*/ ctx[6]})`);
    			add_location(polyline0, file$2, 153, 3, 4324);
    			attr_dev(polyline1, "class", "hand");
    			attr_dev(polyline1, "fill", "cyan");
    			attr_dev(polyline1, "points", "28,-2 32, 0 28,2 30,0");
    			attr_dev(polyline1, "transform", polyline1_transform_value = `rotate(${/*monthAng*/ ctx[7]})`);
    			add_location(polyline1, file$2, 155, 3, 4456);
    			attr_dev(polyline2, "class", "hand");
    			attr_dev(polyline2, "fill", "skyblue");
    			attr_dev(polyline2, "points", "6,-2 10, 0 6,2 7,0");
    			attr_dev(polyline2, "transform", polyline2_transform_value = `rotate(${/*weekAng*/ ctx[5]})`);
    			add_location(polyline2, file$2, 162, 3, 4994);
    			attr_dev(svg, "viewBox", "-50 -50 100 100");
    			add_location(svg, file$2, 118, 2, 2870);
    			add_location(div2, file$2, 117, 1, 2862);
    			attr_dev(div3, "class", "container w-50");
    			add_location(div3, file$2, 107, 0, 2157);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, t0);
    			append_dev(div0, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t6);
    			append_dev(div1, button1);
    			append_dev(button1, i0);
    			append_dev(button1, t7);
    			append_dev(div1, t8);
    			append_dev(div1, button2);
    			append_dev(button2, t9);
    			append_dev(button2, i1);
    			append_dev(div3, t10);
    			append_dev(div3, div2);
    			append_dev(div2, svg);
    			append_dev(svg, circle0);
    			append_dev(svg, circle1);
    			append_dev(svg, circle2);
    			append_dev(svg, circle3);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				if (each_blocks_3[i]) {
    					each_blocks_3[i].m(svg, null);
    				}
    			}

    			append_dev(svg, each0_anchor);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(svg, null);
    				}
    			}

    			append_dev(svg, each1_anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(svg, null);
    				}
    			}

    			append_dev(svg, polyline0);
    			append_dev(svg, polyline1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(svg, null);
    				}
    			}

    			append_dev(svg, polyline2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[19], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[20], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[21], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*currentMonth*/ 2 && t1_value !== (t1_value = /*months*/ ctx[8][/*currentMonth*/ ctx[1]] + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*currentYear*/ 4) set_data_dev(t3, /*currentYear*/ ctx[2]);

    			if (dirty[0] & /*setCurrentYear, startYear, textPos, currentYear*/ 73748) {
    				each_value_3 = /*textPos*/ ctx[13](44, 20);
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(svg, each0_anchor);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty[0] & /*textPos, monthPos, currentMonth, setCurrentMonth, months*/ 11522) {
    				each_value_2 = /*textPos*/ ctx[13](/*monthPos*/ ctx[10], 12);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(svg, each1_anchor);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*days, dt, setCurrentDay*/ 4105) {
    				each_value_1 = /*days*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(svg, polyline0);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*dateAng*/ 64 && polyline0_transform_value !== (polyline0_transform_value = `rotate(${/*dateAng*/ ctx[6]})`)) {
    				attr_dev(polyline0, "transform", polyline0_transform_value);
    			}

    			if (dirty[0] & /*monthAng*/ 128 && polyline1_transform_value !== (polyline1_transform_value = `rotate(${/*monthAng*/ ctx[7]})`)) {
    				attr_dev(polyline1, "transform", polyline1_transform_value);
    			}

    			if (dirty[0] & /*textPos, dt, weekdays*/ 8705) {
    				each_value = /*textPos*/ ctx[13](14, 7);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg, polyline2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*weekAng*/ 32 && polyline2_transform_value !== (polyline2_transform_value = `rotate(${/*weekAng*/ ctx[5]})`)) {
    				attr_dev(polyline2, "transform", polyline2_transform_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let dayAng;
    	let weekdayAng;
    	let monthAng;
    	let dateAng;
    	let weekAng;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('RadialCal', slots, []);
    	let dt = new Date();
    	let currentYear = dt.getFullYear();
    	let currentMonth = dt.getMonth();
    	let days = [];
    	let canShowYears = false;

    	let months = [
    		'Jan',
    		'Feb',
    		'Mar',
    		'Apr',
    		'May',
    		'Jun',
    		'Jul',
    		'Aug',
    		'Sep',
    		'Oct',
    		'Nov',
    		'Dec'
    	];

    	let weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    	let monthPos = 36;
    	let datePos = 26;
    	let startYear = currentYear - currentYear % 10;

    	const lastDate = () => {
    		const ldt = new Date(currentYear, currentMonth + 1, 0).getDate();
    		return ldt;
    	};

    	const showYears = () => {
    		canShowYears = !canShowYears;
    	};

    	const setCurrentMonth = idx => {
    		$$invalidate(1, currentMonth = idx);
    		const d = dt.getDate();
    		$$invalidate(0, dt = new Date(currentYear, idx, d));
    		setDays();
    	};

    	const setCurrentDay = d => {
    		$$invalidate(0, dt = new Date(currentYear, currentMonth, d));
    	};

    	const textPos = (len, numpoints) => {
    		let arr = [];
    		let ang = 360 / numpoints;

    		for (let i = 0; i < numpoints; i++) {
    			const rad = (i * ang - 90) * Math.PI / 180;
    			const x = Math.cos(rad) * len;
    			const y = 1 + Math.sin(rad) * len;
    			arr = [...arr, { val: i, x, y }];
    		}

    		return arr;
    	};

    	const setDays = () => {
    		const ldt = lastDate();
    		$$invalidate(3, days = []);

    		setTimeout(
    			() => {
    				$$invalidate(3, days = textPos(datePos, ldt));
    			},
    			200
    		);
    	};

    	const setToday = () => {
    		$$invalidate(0, dt = new Date());
    		$$invalidate(1, currentMonth = dt.getMonth());
    		$$invalidate(2, currentYear = dt.getFullYear());
    		$$invalidate(4, startYear = currentYear - currentYear % 10);
    		setDays();
    	};

    	const setStartYear = delta => {
    		$$invalidate(4, startYear += delta);
    		$$invalidate(1, currentMonth = 0);
    		setCurrentYear(startYear);
    	};

    	const setCurrentYear = y => {
    		$$invalidate(2, currentYear = y);
    		$$invalidate(1, currentMonth = 0);
    		$$invalidate(4, startYear = currentYear - currentYear % 10);
    		setDays();
    		setCurrentDay(1);
    	};

    	setDays();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<RadialCal> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setToday();
    	const click_handler_1 = () => setStartYear(-20);
    	const click_handler_2 = () => setStartYear(20);
    	const keyup_handler = () => setCurrentYear(1);
    	const click_handler_3 = yi => setCurrentYear(yi + startYear);

    	const click_handler_4 = mIdx => {
    		setCurrentMonth(mIdx);
    	};

    	const keyup_handler_1 = mIdx => {
    		setCurrentMonth(mIdx);
    	};

    	const click_handler_5 = di => setCurrentDay(di);
    	const keyup_handler_2 = di => setCurrentDay(di);

    	$$self.$capture_state = () => ({
    		onMount,
    		dt,
    		currentYear,
    		currentMonth,
    		days,
    		canShowYears,
    		months,
    		weekdays,
    		monthPos,
    		datePos,
    		startYear,
    		lastDate,
    		showYears,
    		setCurrentMonth,
    		setCurrentDay,
    		textPos,
    		setDays,
    		setToday,
    		setStartYear,
    		setCurrentYear,
    		weekdayAng,
    		weekAng,
    		dayAng,
    		dateAng,
    		monthAng
    	});

    	$$self.$inject_state = $$props => {
    		if ('dt' in $$props) $$invalidate(0, dt = $$props.dt);
    		if ('currentYear' in $$props) $$invalidate(2, currentYear = $$props.currentYear);
    		if ('currentMonth' in $$props) $$invalidate(1, currentMonth = $$props.currentMonth);
    		if ('days' in $$props) $$invalidate(3, days = $$props.days);
    		if ('canShowYears' in $$props) canShowYears = $$props.canShowYears;
    		if ('months' in $$props) $$invalidate(8, months = $$props.months);
    		if ('weekdays' in $$props) $$invalidate(9, weekdays = $$props.weekdays);
    		if ('monthPos' in $$props) $$invalidate(10, monthPos = $$props.monthPos);
    		if ('datePos' in $$props) datePos = $$props.datePos;
    		if ('startYear' in $$props) $$invalidate(4, startYear = $$props.startYear);
    		if ('weekdayAng' in $$props) $$invalidate(17, weekdayAng = $$props.weekdayAng);
    		if ('weekAng' in $$props) $$invalidate(5, weekAng = $$props.weekAng);
    		if ('dayAng' in $$props) $$invalidate(18, dayAng = $$props.dayAng);
    		if ('dateAng' in $$props) $$invalidate(6, dateAng = $$props.dateAng);
    		if ('monthAng' in $$props) $$invalidate(7, monthAng = $$props.monthAng);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*currentMonth*/ 2) {
    			$$invalidate(7, monthAng = currentMonth * 30 - 90);
    		}

    		if ($$self.$$.dirty[0] & /*dt, dayAng, currentMonth*/ 262147) {
    			$$invalidate(6, dateAng = (dt.getDate() - 1) * dayAng(currentMonth) - 90);
    		}

    		if ($$self.$$.dirty[0] & /*dt, weekdayAng*/ 131073) {
    			$$invalidate(5, weekAng = dt.getDay() * weekdayAng - 90);
    		}
    	};

    	dayAng = m => parseFloat((360 / lastDate()).toFixed(4));
    	weekdayAng = parseFloat((360 / 7).toFixed(4));

    	return [
    		dt,
    		currentMonth,
    		currentYear,
    		days,
    		startYear,
    		weekAng,
    		dateAng,
    		monthAng,
    		months,
    		weekdays,
    		monthPos,
    		setCurrentMonth,
    		setCurrentDay,
    		textPos,
    		setToday,
    		setStartYear,
    		setCurrentYear,
    		weekdayAng,
    		dayAng,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		keyup_handler,
    		click_handler_3,
    		click_handler_4,
    		keyup_handler_1,
    		click_handler_5,
    		keyup_handler_2
    	];
    }

    class RadialCal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RadialCal",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const todos = writable(['Item-1','Item-2']);

    /* src/Todos.svelte generated by Svelte v3.56.0 */
    const file$1 = "src/Todos.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	child_ctx[14] = i;
    	return child_ctx;
    }

    // (74:12) {:else}
    function create_else_block(ctx) {
    	let button;
    	let i;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[11](/*todoIdx*/ ctx[14]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			attr_dev(i, "class", "fas fa-times");
    			add_location(i, file$1, 74, 107, 2273);
    			attr_dev(button, "class", "btn btn-warning btn-floating text-right");
    			add_location(button, file$1, 74, 12, 2178);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_2, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(74:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (69:12) {#if confirmDelete && currentIdx===todoIdx}
    function create_if_block(ctx) {
    	let div;
    	let button0;
    	let i0;
    	let t;
    	let button1;
    	let i1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t = space();
    			button1 = element("button");
    			i1 = element("i");
    			attr_dev(i0, "class", "fas fa-thumbs-up fa-2x");
    			add_location(i0, file$1, 70, 83, 1945);
    			attr_dev(button0, "class", "btn btn-floating");
    			add_location(button0, file$1, 70, 14, 1876);
    			attr_dev(i1, "class", "far fa-thumbs-down fa-2x");
    			add_location(i1, file$1, 71, 84, 2077);
    			attr_dev(button1, "class", "btn btn-floating");
    			add_location(button1, file$1, 71, 14, 2007);
    			add_location(div, file$1, 69, 12, 1856);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(button0, i0);
    			append_dev(div, t);
    			append_dev(div, button1);
    			append_dev(button1, i1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[9], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[10], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(69:12) {#if confirmDelete && currentIdx===todoIdx}",
    		ctx
    	});

    	return block;
    }

    // (65:6) {#each $todos as todo, todoIdx}
    function create_each_block$1(ctx) {
    	let div2;
    	let div0;
    	let t0_value = /*todo*/ ctx[12] + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2;

    	function select_block_type(ctx, dirty) {
    		if (/*confirmDelete*/ ctx[1] && /*currentIdx*/ ctx[2] === /*todoIdx*/ ctx[14]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			if_block.c();
    			t2 = space();
    			add_location(div0, file$1, 66, 10, 1754);
    			add_location(div1, file$1, 67, 10, 1782);
    			attr_dev(div2, "class", "todo-item svelte-1uo65dw");
    			add_location(div2, file$1, 65, 8, 1720);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			if_block.m(div1, null);
    			append_dev(div2, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$todos*/ 8 && t0_value !== (t0_value = /*todo*/ ctx[12] + "")) set_data_dev(t0, t0_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(65:6) {#each $todos as todo, todoIdx}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div5;
    	let div0;
    	let h2;
    	let t0;
    	let button;
    	let i;
    	let button_disabled_value;
    	let t2;
    	let h6;
    	let t4;
    	let div2;
    	let div1;
    	let span;
    	let t6;
    	let input;
    	let t7;
    	let div4;
    	let div3;
    	let mounted;
    	let dispose;
    	let each_value = /*$todos*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t0 = text("Todos | ");
    			button = element("button");
    			i = element("i");
    			i.textContent = " Remove all";
    			t2 = space();
    			h6 = element("h6");
    			h6.textContent = "(using svelte-store feature)";
    			t4 = space();
    			div2 = element("div");
    			div1 = element("div");
    			span = element("span");
    			span.textContent = "Enter Todo:";
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			div4 = element("div");
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(i, "class", "fas fa-trash fa-1x");
    			add_location(i, file$1, 45, 123, 1087);
    			button.disabled = button_disabled_value = !/*$todos*/ ctx[3].length;
    			attr_dev(button, "class", "btn btn-rounded btn-dark");
    			add_location(button, file$1, 45, 29, 993);
    			attr_dev(h2, "class", "my-4");
    			add_location(h2, file$1, 45, 4, 968);
    			add_location(h6, file$1, 46, 4, 1157);
    			attr_dev(div0, "class", "text-center my-4");
    			add_location(div0, file$1, 44, 2, 933);
    			attr_dev(span, "class", "input-group-text");
    			attr_dev(span, "id", "basic-addon1");
    			add_location(span, file$1, 50, 6, 1272);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "placeholder", "todo text...separated by comma (,) for multiple..");
    			attr_dev(input, "aria-label", "todo item");
    			attr_dev(input, "aria-describedby", "basic-addon1");
    			add_location(input, file$1, 51, 6, 1347);
    			attr_dev(div1, "class", "input-group mb-3");
    			add_location(div1, file$1, 49, 4, 1235);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$1, 48, 2, 1206);
    			add_location(div3, file$1, 63, 4, 1668);
    			attr_dev(div4, "class", "w-full");
    			add_location(div4, file$1, 62, 2, 1643);
    			attr_dev(div5, "class", "container w-50");
    			add_location(div5, file$1, 43, 0, 902);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t0);
    			append_dev(h2, button);
    			append_dev(button, i);
    			append_dev(div0, t2);
    			append_dev(div0, h6);
    			append_dev(div5, t4);
    			append_dev(div5, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    			append_dev(div1, t6);
    			append_dev(div1, input);
    			set_input_value(input, /*todoText*/ ctx[0]);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div3, null);
    				}
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*handleRemoveAll*/ ctx[7], false, false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[8]),
    					listen_dev(input, "change", /*handleTodo*/ ctx[4], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$todos*/ 8 && button_disabled_value !== (button_disabled_value = !/*$todos*/ ctx[3].length)) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			if (dirty & /*todoText*/ 1 && input.value !== /*todoText*/ ctx[0]) {
    				set_input_value(input, /*todoText*/ ctx[0]);
    			}

    			if (dirty & /*handleDelete, confirmDelete, currentIdx, checkConfirm, $todos*/ 110) {
    				each_value = /*$todos*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $todos;
    	validate_store(todos, 'todos');
    	component_subscribe($$self, todos, $$value => $$invalidate(3, $todos = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Todos', slots, []);
    	let todoText = '';
    	let confirmDelete = false;
    	let currentIdx = -1;

    	const handleTodo = () => {
    		const text = todoText.trim();

    		text.split(',').forEach(item => {
    			set_store_value(todos, $todos = [...$todos, item.trim()], $todos);
    		});

    		$$invalidate(0, todoText = '');
    	};

    	const checkConfirm = todoIdx => {
    		$$invalidate(2, currentIdx = todoIdx);
    		$$invalidate(1, confirmDelete = true);
    	};

    	const handleDelete = ok => {
    		if (ok) {
    			set_store_value(todos, $todos = $todos.filter((_, i) => i !== currentIdx), $todos);
    		}

    		$$invalidate(1, confirmDelete = false);
    		$$invalidate(2, currentIdx = -1);
    	};

    	const handleRemoveAll = () => {
    		if (confirm("Are you sure to remove all?")) {
    			set_store_value(todos, $todos = [], $todos);
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Todos> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		todoText = this.value;
    		$$invalidate(0, todoText);
    	}

    	const click_handler = () => handleDelete(true);
    	const click_handler_1 = () => handleDelete(false);
    	const click_handler_2 = todoIdx => checkConfirm(todoIdx);

    	$$self.$capture_state = () => ({
    		todos,
    		todoText,
    		confirmDelete,
    		currentIdx,
    		handleTodo,
    		checkConfirm,
    		handleDelete,
    		handleRemoveAll,
    		$todos
    	});

    	$$self.$inject_state = $$props => {
    		if ('todoText' in $$props) $$invalidate(0, todoText = $$props.todoText);
    		if ('confirmDelete' in $$props) $$invalidate(1, confirmDelete = $$props.confirmDelete);
    		if ('currentIdx' in $$props) $$invalidate(2, currentIdx = $$props.currentIdx);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		todoText,
    		confirmDelete,
    		currentIdx,
    		$todos,
    		handleTodo,
    		checkConfirm,
    		handleDelete,
    		handleRemoveAll,
    		input_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Todos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Todos",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.56.0 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (47:1) {#each components as comp, compIdx}
    function create_each_block(ctx) {
    	let button;
    	let t_value = /*comp*/ ctx[3].name + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[2](/*compIdx*/ ctx[5]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "btn btn-dark btn-lg bg-gradient");
    			add_location(button, file, 47, 2, 1161);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(47:1) {#each components as comp, compIdx}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link0;
    	let link1;
    	let link2;
    	let t0;
    	let div0;
    	let topnav;
    	let t1;
    	let div1;
    	let t2;
    	let div3;
    	let div2;
    	let switch_instance;
    	let current;
    	topnav = new TopNav({ $$inline: true });
    	let each_value = /*components*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	var switch_value = /*components*/ ctx[1][/*currentCompIdx*/ ctx[0]].comp;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    	}

    	const block = {
    		c: function create() {
    			link0 = element("link");
    			link1 = element("link");
    			link2 = element("link");
    			t0 = space();
    			div0 = element("div");
    			create_component(topnav.$$.fragment);
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(link0, "href", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css");
    			attr_dev(link0, "rel", "stylesheet");
    			add_location(link0, file, 2, 0, 38);
    			attr_dev(link1, "href", "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap");
    			attr_dev(link1, "rel", "stylesheet");
    			add_location(link1, file, 7, 0, 171);
    			attr_dev(link2, "href", "https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/6.2.0/mdb.min.css");
    			attr_dev(link2, "rel", "stylesheet");
    			add_location(link2, file, 12, 0, 300);
    			attr_dev(div0, "class", "jumbotron text-center bg-dark text-white");
    			add_location(div0, file, 42, 0, 981);
    			attr_dev(div1, "class", "my-2 text-center d-flex gap-1 justify-content-center");
    			add_location(div1, file, 45, 0, 1055);
    			attr_dev(div2, "class", "vstack");
    			set_style(div2, "height", "80vh");
    			add_location(div2, file, 51, 1, 1311);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file, 50, 0, 1286);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link0);
    			append_dev(document.head, link1);
    			append_dev(document.head, link2);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			mount_component(topnav, div0, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div1, null);
    				}
    			}

    			insert_dev(target, t2, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			if (switch_instance) mount_component(switch_instance, div2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentCompIdx, components*/ 3) {
    				each_value = /*components*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*currentCompIdx*/ 1 && switch_value !== (switch_value = /*components*/ ctx[1][/*currentCompIdx*/ ctx[0]].comp)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div2, null);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(topnav.$$.fragment, local);
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(topnav.$$.fragment, local);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link0);
    			detach_dev(link1);
    			detach_dev(link2);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			destroy_component(topnav);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div3);
    			if (switch_instance) destroy_component(switch_instance);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let currentCompIdx = 0;

    	const components = [
    		{ name: 'Zone Clock', comp: ZoneClock },
    		{ name: 'Radial Calendar', comp: RadialCal },
    		{ name: 'Todos', comp: Todos }
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = compIdx => $$invalidate(0, currentCompIdx = compIdx);

    	$$self.$capture_state = () => ({
    		onMount,
    		TopNav,
    		ZoneClock,
    		RadialCal,
    		Todos,
    		currentCompIdx,
    		components
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentCompIdx' in $$props) $$invalidate(0, currentCompIdx = $$props.currentCompIdx);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentCompIdx, components, click_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
