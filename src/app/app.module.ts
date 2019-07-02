import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { CookieModule } from 'ngx-cookie';

import { TokenInterceptor } from './token.interceptor';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { MaterialModule } from './material';
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { reducers, metaReducers } from './reducers';
import {HotkeyModule} from 'angular2-hotkeys';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';


import { AppComponent } from './app.component';
import { AFTERGLOW_ROUTES } from './routes';
import { environment } from '../environments/environment';
import { TourMatMenuModule } from 'ngx-tour-md-menu';
import { TourNgxPopperModule } from 'ngx-tour-ngx-popper';
import {NgxPopperModule} from 'ngx-popper';
import { ThemePickerModule } from './theme-picker';
@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(AFTERGLOW_ROUTES, { enableTracing: false }),
    MaterialModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    CookieModule.forRoot(),
    // TourMatMenuModule.forRoot(),
    TourNgxPopperModule.forRoot(),
    NgxPopperModule,
    ThemePickerModule,

    /**
     * StoreModule.forRoot is imported once in the root module, accepting a reducer
     * function or object map of reducer functions. If passed an object of
     * reducers, combineReducers will be run creating your application
     * meta-reducer. This returns all providers for an @ngrx/store
     * based application.
     */

     // Can't enable strict immutability because we hold array buffers in within the state which cannot be frozen
    StoreModule.forRoot(reducers, { metaReducers, runtimeChecks: { strictStateImmutability: false, strictActionImmutability: false } }),


    /**
     * Store devtools instrument the store retaining past versions of state
     * and recalculating new states. This enables powerful time-travel
     * debugging.
     *
     * To use the debugger, install the Redux Devtools extension for either
     * Chrome or Firefox
     *
     * See: https://github.com/zalmoxisus/redux-devtools-extension
     */
    !environment.production
      ? StoreDevtoolsModule.instrument()
      : [],

    /**
     * EffectsModule.forRoot() is imported once in the root module and
     * sets up the effects class to be initialized immediately when the
     * application starts.
     *
     * See: https://github.com/ngrx/platform/blob/master/docs/effects/api.md#forroot
     */
    EffectsModule.forRoot([]),

    /**
     * `provideDB` sets up @ngrx/db with the provided schema and makes the Database
     * service available.
     */

    CoreModule.forRoot(),
    AuthModule.forRoot(),
    HotkeyModule.forRoot()
  ],

  declarations: [
    AppComponent
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    },

  ],
  bootstrap: [AppComponent],
})
export class AppModule { }