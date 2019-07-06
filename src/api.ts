import Vue, {
  ComponentOptions,
  FunctionalComponentOptions,
  VueConstructor
} from "vue";
import {
  RecordPropsDefinition,
  ThisTypedComponentOptionsWithRecordProps as ThisTypedComponentOptions
} from "vue/types/options";

import { InnerScopedSlots, TsxComponentTypeInfo } from "../types/base";
import { EventsNativeOn, AllHTMLAttributes } from "../types/dom";

export type TsxComponentInstance<
  V extends Vue,
  Props,
  EventsWithOn,
  ScopedSlotArgs
> = {
  _tsx: TsxComponentTypeInfo<Props, EventsWithOn, {}, {}>;
  $scopedSlots: InnerScopedSlots<ScopedSlotArgs>;
} & V;

export type TsxComponent<
  V extends Vue,
  Props = {},
  EventsWithOn = {},
  ScopedSlotArgs = {},
  AdditionalThisAttrs = {}
> = VueConstructor<
  TsxComponentInstance<V, Props, EventsWithOn, ScopedSlotArgs> &
    AdditionalThisAttrs
>;

export class Component<
  Props,
  EventsWithOn = {},
  ScopedSlotArgs = {}
> extends Vue {
  _tsx!: TsxComponentTypeInfo<Props, EventsWithOn, {}, {}>;
  $scopedSlots!: InnerScopedSlots<ScopedSlotArgs>;
}

/**
 * Create component from component options (Compatible with Vue.extend)
 */
export function createComponent<TProps, TEvents = {}, TScopedSlots = {}>(
  opts: ComponentOptions<Vue> | FunctionalComponentOptions
): TsxComponent<Vue, TProps, TEvents, TScopedSlots> {
  return Vue.extend(opts as any) as any;
}

export interface Factory<TProps, TEvents, TScopedSlots> {
  convert<V extends Vue>(
    componentType: new (...args: any[]) => V
  ): TsxComponent<V, TProps, TEvents, TScopedSlots>;
  extendFrom<VC extends typeof Vue>(
    componentType: VC
  ): TsxComponent<InstanceType<VC>, TProps, TEvents, TScopedSlots>;
}

const factoryImpl = {
  convert: (c: any) => c,
  extendFrom: (c: any) => c
};

/**
 * Specify Props and Event types of component
 *
 * Usage:
 *  // Get TSX-supported component with props(`name`, `value`) and event(`onInput`)
 *  const NewComponent = tsx.ofType<{ name: string, value: string }, { onInput: string }>.convert(Component);
 */
export function ofType<TProps, TEvents = {}, TScopedSlots = {}>(): Factory<
  TProps,
  TEvents,
  TScopedSlots
> {
  return factoryImpl;
}

export function withNativeOn<VC extends typeof Vue>(
  componentType: VC
): TsxComponent<InstanceType<VC>, {}, EventsNativeOn, {}> {
  return componentType as any;
}

export function withHtmlAttrs<VC extends typeof Vue>(
  componentType: VC
): TsxComponent<InstanceType<VC>, AllHTMLAttributes, {}, {}> {
  return componentType as any;
}

export function withUnknownProps<VC extends typeof Vue>(
  componentType: VC
): TsxComponent<InstanceType<VC>, { [key: string]: any }, {}, {}> {
  return componentType as any;
}

/**
 * Experimental support for new typings introduced from Vue 2.5
 * Depending on some private types of vue, which may be changed by upgrade :(
 */

// If props is
//   `{ foo: String, bar: String, baz: { type: String, required: true as true} }`
// then, `RequiredPropNames<typeof props>` is "baz",
export type RequiredPropNames<PropsDef extends RecordPropsDefinition<any>> = ({
  [K in keyof PropsDef]: PropsDef[K] extends { required: true } ? K : never
})[Extract<keyof PropsDef, string>];

export type PropsForOutside<Props, RequiredPropNames extends keyof Props> = {
  [K in RequiredPropNames]: Props[K]
} &
  { [K in Exclude<keyof Props, RequiredPropNames>]?: Props[K] };

export interface ComponentFactory<
  BaseProps,
  EventsWithOn,
  ScopedSlotArgs,
  AdditionalThisAttrs,
  Super extends Vue
> {
  create<
    Props,
    PropsDef extends RecordPropsDefinition<Props>,
    RequiredProps extends keyof Props = RequiredPropNames<PropsDef> &
      keyof Props
  >(
    options: FunctionalComponentOptions<
      Props,
      PropsDef & RecordPropsDefinition<Props>
    >,
    requiredProps?: RequiredProps[]
  ): TsxComponent<
    Super,
    PropsForOutside<Props, RequiredProps> & BaseProps,
    EventsWithOn,
    ScopedSlotArgs,
    Props
  >;

  create<
    Data,
    Methods,
    Computed,
    Props,
    PropsDef extends RecordPropsDefinition<Props>,
    RequiredProps extends keyof Props = RequiredPropNames<PropsDef> &
      keyof Props
  >(
    options: ThisTypedComponentOptions<
      AdditionalThisAttrs & Super & Vue,
      Data,
      Methods,
      Computed,
      Props
    > & {
      props?: PropsDef;
    },
    requiredPropsNames?: RequiredProps[]
  ): TsxComponent<
    Super,
    PropsForOutside<Props, RequiredProps> & BaseProps,
    EventsWithOn,
    ScopedSlotArgs,
    Data & Methods & Computed & Props
  >;

  mixin<Data, Methods, Computed, Props>(
    mixinObject: ThisTypedComponentOptions<Vue, Data, Methods, Computed, Props>
  ): ComponentFactory<
    BaseProps & Props,
    EventsWithOn,
    ScopedSlotArgs,
    AdditionalThisAttrs & Data & Methods & Computed & Props,
    Super
  >;

  mixin<VC extends typeof Vue>(
    mixinObject: VC
  ): ComponentFactory<
    BaseProps,
    EventsWithOn,
    ScopedSlotArgs,
    AdditionalThisAttrs & { $scopedSlots: InnerScopedSlots<ScopedSlotArgs> },
    InstanceType<VC> & Super
  >;
}

export interface ExtendableComponentFactory<
  BaseProps,
  EventsWithOn,
  ScopedSlotArgs,
  AdditionalThisAttrs,
  Super extends Vue
>
  extends ComponentFactory<
      BaseProps,
      EventsWithOn,
      ScopedSlotArgs,
      AdditionalThisAttrs,
      Super
    > {
  extendFrom<VC extends typeof Vue>(
    componentType: VC
  ): ComponentFactory<
    BaseProps,
    EventsWithOn,
    ScopedSlotArgs,
    AdditionalThisAttrs & { $scopedSlots: InnerScopedSlots<ScopedSlotArgs> },
    InstanceType<VC>
  >;
}

function createComponentFactory(
  base: typeof Vue,
  mixins: any[]
): ComponentFactory<any, any, any, any, Vue> {
  return {
    create(options: any): any {
      const mergedMixins = options.mixins
        ? [...options.mixins, ...mixins]
        : mixins;
      return base.extend({ ...options, mixins: mergedMixins });
    },
    mixin(mixinObject: any): any {
      return createComponentFactory(base, [...mixins, mixinObject]);
    }
  };
}

function createExtendableComponentFactory(): ExtendableComponentFactory<
  any,
  any,
  any,
  any,
  Vue
> {
  return {
    create(options: any): any {
      return Vue.extend(options);
    },
    extendFrom(base: typeof Vue): any {
      return createComponentFactory(base, []);
    },
    mixin(mixinObject: any): any {
      return createComponentFactory(Vue, [mixinObject]);
    }
  };
}

export const componentFactory: ExtendableComponentFactory<
  {},
  {},
  {},
  {},
  Vue
> = createExtendableComponentFactory();

export function componentFactoryOf<
  EventsWithOn = {},
  ScopedSlotArgs = {}
>(): ComponentFactory<
  {},
  EventsWithOn,
  ScopedSlotArgs,
  { $scopedSlots: InnerScopedSlots<ScopedSlotArgs> },
  Vue
> {
  return componentFactory as any;
}

/**
 * Shorthand of `componentFactory.create`
 */
export const component = componentFactory.create;
export const extendFrom = componentFactory.extendFrom;
