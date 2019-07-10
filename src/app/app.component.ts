import { Component, OnInit, AfterViewInit, Renderer2, OnDestroy } from "@angular/core";
import { CookieService } from "ngx-cookie";
import { AnyFn } from "@ngrx/store/src/selector";
import { Title } from "@angular/platform-browser";
import { Router, NavigationEnd, ActivatedRoute } from "@angular/router";
import { Observable, Subscription, Subscribable } from "rxjs";
import { Store } from "@ngrx/store";
import { AuthGuard } from "./auth/services/auth-guard.service";

import * as fromAuth from "./auth/reducers";
import * as fromRoot from "./reducers";
import * as fromDataFiles from "./data-files/reducers";
import * as fromDataProviders from "./data-providers/reducers";
import * as coreActions from "./core/actions/core";
import * as authActions from "./auth/actions/auth";
import * as workbenchActions from "./core/actions/workbench";
import * as dataFileActions from "./data-files/actions/data-file";
import * as dataProviderActions from "./data-providers/actions/data-provider";
import { User } from "./auth/models/user";
import { HotkeysService, Hotkey } from "../../node_modules/angular2-hotkeys";
import { ThemeStorage } from "./theme-picker/theme-storage/theme-storage";
import { WorkbenchGuard } from "./core/services/workbench-guard.service";
import { DataProvider } from "./data-providers/models/data-provider";
import { HelpDialogComponent } from "./core/components/help-dialog/help-dialog.component";
import { MatDialog } from "@angular/material";
import { ThemeDialogComponent } from "./core/components/theme-dialog/theme-dialog.component";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private currentRoutes: any[] = [];
  loggedIn$: Observable<boolean>;
  private user$: Observable<User>;
  private loggedInSub: Subscription;
  private colorThemeName: string;
  private fontSize: "default" | "large" | "largest";
  private fontWeight: "default" | "bold" | "boldest";
  private dataProviders$: Observable<Array<DataProvider>>;

  private hotKeys: Array<Hotkey> = [];

  public constructor(
    private store: Store<fromRoot.State>,
    private authGuard: AuthGuard,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private renderer: Renderer2,
    private themeStorage: ThemeStorage,
    public dialog: MatDialog,
    private _hotkeysService: HotkeysService
  ) {
    let theme = this.themeStorage.getCurrentTheme();
    if (!theme) {
      theme = {
        colorThemeName: this.themeStorage.colorThemes[0].name,
        fontSize: "default",
        fontWeight: "default"
      };
      this.themeStorage.storeTheme(theme);
    }
    this.colorThemeName = theme.colorThemeName;
    this.renderer.addClass(document.body, this.colorThemeName);
    this.fontSize = theme.fontSize;
    if (this.fontSize != "default")
      this.renderer.addClass(document.body, this.fontSize);
    this.fontWeight = theme.fontWeight;
    if (this.fontWeight != "default")
      this.renderer.addClass(document.body, this.fontWeight);

    this.themeStorage.onThemeUpdate.subscribe(theme => {
      this.renderer.removeClass(document.body, this.colorThemeName);
      this.colorThemeName = theme.colorThemeName;
      this.renderer.addClass(document.body, this.colorThemeName);

      if (this.fontSize != "default")
        this.renderer.removeClass(document.body, this.fontSize);
      this.fontSize = theme.fontSize;
      if (this.fontSize != "default")
        this.renderer.addClass(document.body, this.fontSize);

      if (this.fontWeight != "default")
        this.renderer.removeClass(document.body, this.fontWeight);
      this.fontWeight = theme.fontWeight;
      if (this.fontWeight != "default")
        this.renderer.addClass(document.body, this.fontWeight);
    });

    this.dataProviders$ = this.store.select(fromDataProviders.getDataProviders);

    this.loggedIn$ = this.store.select(fromAuth.getLoggedIn);
    this.user$ = this.store.select(fromAuth.getUser);

    if (this.authGuard.isLoggedIn()) {
      this.store.dispatch(new authActions.Init({ loggedIn: true }));
    }

    this.hotKeys.push(
      new Hotkey(
        "W",
        (event: KeyboardEvent): boolean => {
          this.router.navigate(["workbench"]);
          this.store.dispatch(new workbenchActions.SetFullScreen({value: false}))
          return false; // Prevent bubbling
        },
        undefined,
        "Workbench"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "D",
        (event: KeyboardEvent): boolean => {
          this.router.navigate(["data-providers"]);
          return false; // Prevent bubbling
        },
        undefined,
        "Data Providers"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "T",
        (event: KeyboardEvent): boolean => {
          this.dialog.open(ThemeDialogComponent, {
            data: {},
            width: "500px",
            height: "400px"
          });
          return false; // Prevent bubbling
        },
        undefined,
        "Quick Start Guide"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "?",
        (event: KeyboardEvent): boolean => {
          this.dialog.open(HelpDialogComponent, {
            data: {},
            width: "800px",
            height: "600px"
          });
          return false; // Prevent bubbling
        },
        undefined,
        "Quick Start Guide"
      )
    );

    
    this.hotKeys.forEach(hotKey => this._hotkeysService.add(hotKey));

    // localStorage.setItem("previouslyVisited", "false");
    // this.tourService.events$.subscribe(x => console.log(x));
    // this.tourService.initialize(
    //   [
    //     {
    //       anchorId: "primary navigation",
    //       content:
    //         "This is Afterglow's main navigation menu.  You are currently viewing the Workbench.  Click the next button below or press the right arrow key on your keyboard to continue.",
    //       title: "Navigation Menu",
    //       route: "/workbench"
    //     },
    //     {
    //       anchorId: "workbench nav link",
    //       content:
    //         "The workbench is where you will find tools for analyzing and manipulating your image data. You can adjust the appearance of the image, make plots, measure objects, sonify, and much more.",
    //       title: "Workbench",
    //       route: "/workbench"
    //     },
    //     {
    //       anchorId: "data providers nav link",
    //       content:
    //         "Before you can use the workbench tools,  you need to import image files into your Afterglow library.  This is done on the data providers page.  For this tour,  we will automatically import an image from a data provider for you.  After the tour,  come back to this page using the main navigation menu if you want to import additional images from other data providers.",
    //       title: "Data Providers",
    //       route: "/data-providers"
    //     },
    //     {
    //       anchorId: "tour nav link",
    //       content:
    //         "As a reminder, you can access this tour at any time in the future by clicking this help button.  Click next to learn more about the workbench.",
    //       title: "Tour",
    //       route: "/workbench"
    //     },
    //     {
    //       anchorId: "file library",
    //       content:
    //         "The panel on the left side of the screen allows you to manage all of the files you have imported into your library.  You can select, search, and delete files from this panel.",
    //       title: "File Library",
    //       route: "/workbench"
    //     },
    //     {
    //       anchorId: "file libary show/hide",
    //       content:
    //         "You can hide the file library by clicking this file icon.  Simply click the icon a second time to make it visible again.",
    //       title: "Hide File Library",
    //       route: "/workbench"
    //     },

    //     {
    //       anchorId: "display settings",
    //       content:
    //         "The panel on the right side of the screen is where you will find all of the processing and analysis tools.  You are currently viewing the display settings.  This is where you can change how the image is displayed on the screen by adjusting the orientation, color mapping, scaling, and more.",
    //       title: "Display Settings",
    //       route: "/workbench/viewer"
    //     },
    //     {
    //       anchorId: "marker settings",
    //       content:
    //         "This is where you can add custom markers to your image.  This is great for identifying known targets, making a finding chart, or for adding labels to your image.",
    //       title: "Custom Markers",
    //       route: "/workbench/markers"
    //     },
    //     {
    //       anchorId: "plotter settings",
    //       content:
    //         "The plotter tool is useful for plotting the cross sections through or the separation between sources in your image.  To plot,  simply click once in your image to set the starting point and click again to set the ending point.",
    //       title: "Plotter",
    //       route: "/workbench/plotter"
    //     },
    //     {
    //       anchorId: "sonifier settings",
    //       content:
    //         "The sonification tool converts the pixel data in to sound.",
    //       title: "Sonifier",
    //       route: "/workbench/sonifier"
    //     },
    //     {
    //       anchorId: "source extraction settings",
    //       content:
    //         "The source extraction tool allows you to identify sources in your image files through manual clicking or through automatic extraction.  Once they've been identified,  you can photometer them in one or more of your image files and download the results.",
    //       title: "Source Extraction",
    //       route: "/workbench/source-extractor"
    //     },
    //     {
    //       anchorId: "display settings",
    //       content:
    //         "Similar to the file library panel,  you can hide the workbench tools panel by clicking the icon next to the active tool.  Clicking it a second time will make it visible again.",
    //       title: "Hide Workbench Tools",
    //       route: "/workbench/viewer"
    //     },

    //   ],
    //   {
    //     popperSettings: {
    //       closeOnClickOutside: false,
    //       hideOnClickOutside: false
    //     }
    //   }
    // );

    // this.loggedInSub = this.loggedIn$.subscribe(loggedIn => {
    //   this.currentRoutes = routes.filter(route => route.menuType == MenuType.BRAND || (('canActivate' in route) == loggedIn));
    // })
  }

  getTitle(state, parent) {
    var data = [];
    if (parent && parent.snapshot.data && parent.snapshot.data.title) {
      data.push(parent.snapshot.data.title);
    }

    if (state && parent) {
      data.push(...this.getTitle(state, state.firstChild(parent)));
    }
    return data;
  }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        var title = [
          ...this.getTitle(
            this.router.routerState,
            this.router.routerState.root
          ).reverse(),
          "Afterglow Access"
        ].join(" | ");
        this.titleService.setTitle(title);
      }
    });

    this.store.dispatch(new coreActions.Initialize());
  }

  ngAfterViewInit() {}

  
  ngOnDestroy() {
    this.hotKeys.forEach(hotKey => this._hotkeysService.remove(hotKey));
  }

}
