
/* IMPORT */

import Observable from './observable';
import Owner from './owner';
import {isArray, isSet} from './utils';
import {CleanupFunction, Context, ErrorFunction} from './types';

/* MAIN */

class Observer {

  /* VARIABLES */

  public dirty?: boolean; // If dirty it needs updating
  protected cleanups?: CleanupFunction[] | CleanupFunction;
  protected context?: Context;
  protected errors?: ErrorFunction[] | ErrorFunction;
  protected observables?: Observable[] | Observable;
  protected observers?: Set<Observer> | Observer;
  private parent?: Observer;

  /* REGISTRATION API */

  registerCleanup ( cleanup: CleanupFunction ): void {

    if ( !this.cleanups ) {

      this.cleanups = cleanup;

    } else if ( isArray ( this.cleanups ) ) {

      this.cleanups.push ( cleanup );

    } else {

      this.cleanups = [this.cleanups, cleanup];

    }

  }

  registerContext <T> ( symbol: symbol, value: T ): T {

    if ( !this.context ) this.context = {};

    this.context[symbol] = value;

    return value;

  }

  registerError ( error: ErrorFunction ): void {

    if ( !this.errors ) {

      this.errors = error;

    } else if ( isArray ( this.errors ) ) {

      this.errors.push ( error );

    } else {

      this.errors = [this.errors, error];

    }

  }

  registerObservable ( observable: Observable ): void {

    if ( !this.observables ) {

      this.observables = observable;

    } else if ( isArray ( this.observables ) ) {

      this.observables.push ( observable );

    } else {

      this.observables = [this.observables, observable];

    }

  }

  registerObserver ( observer: Observer ): void {

    if ( !this.observers ) {

      this.observers = observer;

    } else if ( isSet ( this.observers ) ) {

      this.observers.add ( observer );

    } else {

      const observerPrev = this.observers;

      this.observers = new Set ();

      this.observers.add ( observerPrev );
      this.observers.add ( observer );

    }

  }

  registerParent ( observer: Observer ): void {

    this.parent = observer;

  }

  registerSelf (): void {

    if ( !this.observables ) {

      return;

    } else if ( isArray ( this.observables ) ) {

      Owner.registerObservables ( this.observables );

    } else {

      Owner.registerObservable ( this.observables );

    }

  }

  unregisterObserver ( observer: Observer ): void {

    if ( !this.observers ) {

      return;

    } else if ( isSet ( this.observers ) ) {

      this.observers.delete ( observer )

    } else if ( this.observers === observer ) {

      this.observers = undefined;

    }

  }

  unregisterParent (): void {

    this.parent = undefined;

  }

  /* API */

  update (): void {

    this.dirty = false;

  }

  updateContext <T> ( symbol: symbol ): T | undefined {

    const {context, parent} = this;

    if ( context && symbol in context ) return context[symbol];

    if ( !parent ) return;

    return parent.updateContext ( symbol );

  }

  updateError ( error: unknown, silent?: boolean ): boolean {

    const {errors, parent} = this;

    if ( errors ) {

      if ( isArray ( errors ) ) {

        errors.forEach ( fn => fn ( error ) );

      } else {

        errors ( error );

      }

      return true;

    } else {

      if ( parent ) {

        if ( parent.updateError ( error, true ) ) return true;

      }

      if ( !silent ) {

        throw error;

      }

      return false;

    }

  }

  /* STATIC API */

  static unsubscribe ( observer: Observer ): void {

    const {observers, observables, cleanups, errors, context} = observer;

    if ( observers ) {
      if ( isSet ( observers ) ) {
        for ( const observer of observers ) {
          Observer.unsubscribe ( observer );
        }
        observer.observers = undefined;
      } else {
        Observer.unsubscribe ( observers );
        observer.observers = undefined;
      }
    }

    if ( observables ) {
      if ( isArray ( observables ) ) {
        for ( let i = 0, l = observables.length; i < l; i++ ) {
          observables[i].unregisterObserver ( observer );
        }
        observer.observables = undefined;
      } else {
        observables.unregisterObserver ( observer );
        observer.observables = undefined;
      }
    }

    if ( cleanups ) {
      if ( isArray ( cleanups ) ) {
        for ( let i = 0, l = cleanups.length; i < l; i++ ) {
          cleanups[i]();
        }
        observer.cleanups = undefined;
      } else {
        cleanups ();
        observer.cleanups = undefined;
      }
    }

    if ( errors ) {
      observer.errors = undefined;
    }

    if ( context ) {
      observer.context = undefined;
    }

  }

}

/* EXPORT */

export default Observer;
