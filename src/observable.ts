
/* IMPORT */

import oby from '.';
import Context from './context';
import {IObservable, IDisposer, IListener} from './types';

/* MAIN */

class Observable<T = unknown> {

  /* VARIABLES */

  private disposer: IDisposer | undefined;
  private listeners: IListener<T>[] | undefined;
  private value: T;

  /* CONSTRUCTOR */

  constructor ( value: T, disposer?: IDisposer ) {

    this.disposer = disposer;
    this.listeners = undefined;
    this.value = value;

  }

  /* API */

  call (): T;
  call ( ...args: [Exclude<T, Function> | (( valuePrev: T ) => T)] ): T;
  call ( ...args: [Exclude<T, Function> | (( valuePrev: T ) => T)] | [] ): T {

    if ( !args.length ) return this.get ();

    if ( typeof args[0] === 'function' ) return this.set ( ( args[0] as any )( this.value ) ); //TSC

    return this.set ( args[0] );

  }

  get (): T {

    Context.link ( this );

    return this.value;

  }

  sample (): T {

    return this.value;

  }

  set ( value: T ): T {

    const valuePrev = this.value;

    if ( Object.is ( value, valuePrev ) ) return valuePrev;

    this.value = value;

    const listeners = this.listeners;

    if ( listeners ) {

      for ( let i = 0, l = listeners.length; i < l; i++ ) {

        listeners[i]( this.value, valuePrev );

      }

    }

    return this.value;

  }

  on ( listener: IListener<T>, immediate: boolean = false ): void {

    this.listeners || ( this.listeners = [] );

    const index = this.listeners.indexOf ( listener );

    if ( index < 0 ) {

      this.listeners.push ( listener );

    }

    if ( immediate ) {

      listener ( this.value, undefined );

    }

  }

  off ( listener: IListener<T> ): void {

    if ( !this.listeners ) return;

    const index = this.listeners.indexOf ( listener );

    if ( index < 0 ) return;

    this.listeners = this.listeners.filter ( ( _, i ) => i !== index );

  }

  computed <U> ( fn: ( value: T ) => U ): IObservable<U> {

    const listener = ( value: T ) => observable.set ( fn ( value ) );
    const disposer = () => this.off ( listener );
    const observable = oby ( fn ( this.value ), disposer );

    this.on ( listener );

    return observable;

  }

  dispose (): void {

    if ( !this.disposer ) return;

    this.disposer ();

    this.disposer = undefined;

  }

}

/* EXPORT */

export default Observable;
