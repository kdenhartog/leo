import { createElement, useRef, useEffect, forwardRef, useCallback, type ForwardedRef, type PropsWithChildren } from "react"
import type { SvelteComponent, SvelteComponentTyped } from "svelte"

const eventRegex = /on([A-Z]{1,}[a-zA-Z]*)/
const watchRegex = /watch([A-Z]{1,}[a-zA-Z]*)/

// TODO(petemill): 
// When web-components are supported in react (currently only in experimental version), then we can 
// directly use the web-component and define it's availability as a global jsx element, 
// avoiding `SvelteWebComponentToReact`, via:
//
// type CustomElement<T> = Partial<T & React.DOMAttributes<T> & { children: any }>
//
// declare global {
//   namespace JSX {
//     interface IntrinsicElements {
//       ['leo-button']: CustomElement<Props>
//     }
//   }
// }

export type SvelteProps<T> = T extends SvelteComponentTyped<infer Props, any, any> ? Props : {}
export type SvelteEvents<T> = T extends SvelteComponentTyped<any, infer Events, any> ? Events : {}
export type ReactProps<Props, Events> = Props & {
  [P in keyof Events as `on${Capitalize<P & string>}`]?: (e: Events[P]) => void
} & {
  ref?: ForwardedRef<Props>
}

/**
 * 
 * @param tag custom element tag name for svelte component
 * @param component The imported svelte component itself. This is not used, but ensures that the component's code has been included in the bundle.
 * @returns A react component
 */
export default function SvelteWebComponentToReact<T extends Record<string, any>>(tag: string, component: typeof SvelteComponent) {
  return forwardRef((props: PropsWithChildren<T>, forwardedRef: ForwardedRef<SvelteComponent>) => {
    const component = useRef<SvelteComponent>()

    const setRef = useCallback((ref: SvelteComponent) => {
      if (!ref) {
        console.error('No component for tag', tag)
        return
      }
      if (component.current) {
        console.warn('Component replaced, this should not be common', tag, component.current, ref)
        component.current.$destroy()
      }
      // Make sure we actually made a svelte component. This can
      // go wrong if the custom-element tag name is changed.
      if (!ref.$on) {
        console.error(`Creating element with tag name "${tag}" did not result in a Svelte component! Please make sure the tag name is correct and the component code is included on the page.`)
        return
      }
      component.current = ref
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') forwardedRef(ref)
        else forwardedRef.current = ref
      }

      // Events fire callbacks when the event is dispatched
      // from the svelte component.
      // Watchers fire callbacks when the variable (aka property or attribute)
      // of the svelte component is changed.
      const watchers: [string, Function][] = []
      for (const key in props) {
        if (typeof props[key] !== 'function') {
          continue
        }
        const eventHandler: (event: any) => void = props[key]
        // It's either an event or a watch
        const eventMatch = key.match(eventRegex)
        if (eventMatch) {
          ref.$on(
            `${eventMatch[1][0].toLowerCase()}${eventMatch[1].slice(1)}`,
            eventHandler
          )
          continue
        }
        const watchMatch = key.match(watchRegex)
        if (watchMatch) {
          watchers.push([
            `${watchMatch[1][0].toLowerCase()}${watchMatch[1].slice(1)}`,
            eventHandler,
          ])
        }
      }

      if (watchers.length) {
        const update = component.current.$$.update
        component.current.$$.update = function (...updateArgs) {
          watchers.forEach(([name, callback]) => {
            if (component.current) {
              const index = component.current.$$.props[name]
              callback((component.current.$$.ctx as any)[index])
            }
          })
          update.apply(null, updateArgs)
        }
      }
    }, [])

    useEffect(() => {
      // Create a dictionary of all our properties without events. If we pass an
      // onClick prop through to Svelte, we could inadvertently set it on the
      // HTMLElement if we use <el {...$restProps}/>, which causes a Svelte to
      // setAttribute('onClick', props['onClick']). This can lead to unexpected
      // behavior, and triggers a TrustedTypes error.
      const propsSansEvents = { ...props }
      for (const event of Object.keys(props).filter(name => eventRegex.test(name))) {
        delete propsSansEvents[event]
      }

      if (component.current) {
        component.current.$set(propsSansEvents)
      }
    }, [props])

    useEffect(() => {
      return () => {
        if (component.current) {
          // component.current.$destroy()
        }
      }
    }, [])

    return createElement(tag, { ref: setRef, children: props.children })
  })
}
