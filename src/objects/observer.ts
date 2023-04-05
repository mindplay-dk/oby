
/* IMPORT */

import {DIRTY_NO, DIRTY_MAYBE_NO, DIRTY_MAYBE_YES, DIRTY_YES} from '~/constants';
import {OWNER} from '~/context';
import {lazyArrayPush} from '~/lazy';
import Owner from '~/objects/owner';
import type {IObservable, IOwner, WrappedFunction, Signal} from '~/types';

/* MAIN */

class Observer extends Owner {

  /* VARIABLES */

  parent: IOwner = OWNER;
  signal: Signal = OWNER.signal;
  status: number = DIRTY_YES;
  observables: IObservable[] = [];
  observablesIndex: number = 0;
  sync?: boolean;

  /* CONSTRUCTOR */

  constructor () {

    super ();

    lazyArrayPush ( this.parent, 'observers', this );

  }

  /* API */

  dispose ( shallow?: boolean ): void {

    if ( !shallow ) {

      const observables = this.observables;
      const observablesLength = observables.length;

      if ( observablesLength ) {

        for ( let i = 0; i < observablesLength; i++ ) {

          observables[i].observers.delete ( this );

        }

        this.observables = [];

      }

    }

    super.dispose ();

  }

  postdispose (): void {

    const observables = this.observables;
    const observablesIndex = this.observablesIndex;
    const observablesLength = observables.length;

    if ( observablesIndex < observablesLength ) {

      for ( let i = observablesIndex; i < observablesLength; i++ ) {

        observables[i].observers.delete ( this );

      }

      observables.length = observablesIndex;

    }

  }

  link ( observable: IObservable<any> ): void {

    const observables = this.observables;
    const observablesIndex = this.observablesIndex;
    const observablesLength = observables.length;

    if ( observablesIndex < observablesLength ) {

      if ( observable === observables[observablesIndex] ) {

        this.observablesIndex += 1;

        return;

      }

      this.postdispose ();

    }

    observable.observers.add ( this );

    observables[this.observablesIndex++] = observable;

  }

  wrap <T> ( fn: WrappedFunction<T> ): T {

    this.dispose ( true );

    this.observablesIndex = 0;

    try {

      return super.wrap ( fn, this, this );

    } finally {

      this.postdispose ();

    }

  }

  run (): void {

    throw new Error ( 'Abstract method' );

  }

  stale ( status: number ): void {

    throw new Error ( 'Abstract method' );

  }

  update (): void {

    if ( this.signal.disposed ) return; // Disposed, it shouldn't be updated again

    if ( this.status === DIRTY_MAYBE_YES ) { // Maybe we are dirty, let's check with our observables, to be sure

      const observables = this.observables;

      for ( let i = 0, l = observables.length; i < l; i++ ) {

        observables[i].parent?.update ();

        // if ( this.status === DIRTY_YES ) break; // We are dirty, no need to check the rest //TODO: This line makes the system lazier, but it conflicts with synchronous computations and optimized disposal

      }

    }

    if ( this.status === DIRTY_YES ) { // We are dirty, let's refresh

      this.status = DIRTY_MAYBE_NO; // Trip flag, to be able to tell if we caused ourselves to be dirty again

      this.run ();

      if ( this.status === DIRTY_MAYBE_NO ) { // Not dirty anymore

        this.status = DIRTY_NO;

      } else { // Maybe we are still dirty, let's check again

        this.update ();

      }

    } else { // Not dirty

      this.status = DIRTY_NO;

    }

  }

}

/* EXPORT */

export default Observer;
