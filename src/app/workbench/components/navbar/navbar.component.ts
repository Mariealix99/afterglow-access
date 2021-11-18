import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HelpDialogComponent } from '../help-dialog/help-dialog.component';
import { DataProvider } from '../../../data-providers/models/data-provider';
import { ThemeDialogComponent } from '../theme-dialog/theme-dialog.component';
import { Router } from '@angular/router';
import { CoreUser } from '../../../auth/models/user';
import { Store } from '@ngxs/store';
import { Logout, Login } from '../../../auth/auth.actions';
import { Navigate } from '@ngxs/router-plugin';
import { ShortcutInput } from 'ng-keyboard-shortcuts';
import { WorkbenchState } from '../../workbench.state';
import { PhotSettingsDialogComponent } from '../phot-settings-dialog/phot-settings-dialog.component';
import { UpdatePhotometrySettings } from '../../workbench.actions';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnChanges {
  avatarName = null;

  @Input() dataProviders: Array<DataProvider>;
  @Input('user') user: CoreUser;

  shortcuts: ShortcutInput[] = [];

  constructor(public dialog: MatDialog, private router: Router, private store: Store) { }

  ngOnInit() { }

  ngOnChanges() {
    if (!this.user) {
      this.avatarName = null;
    } else if (this.user.firstName && this.user.lastName)
      this.avatarName = `${this.user.firstName} ${this.user.lastName}`;
    else if (this.user.username) this.avatarName = this.user.username;
    else if (this.user.email) this.avatarName = this.user.email;
    else {
      this.avatarName = null;
    }
  }

  ngAfterViewInit() {
    this.shortcuts.push({
      key: 'T',
      label: 'Open Theme Settings',
      command: (e) => this.openThemeDialog(),
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '?',
      label: 'Open Help Dialog',
      command: (e) => this.openQuickStartGuide(),
      preventDefault: true,
    });
  }

  openQuickStartGuide() {
    this.dialog.open(HelpDialogComponent, {
      data: {},
      width: '900px',
      maxWidth: '900px',
    });
  }

  openThemeDialog() {
    this.dialog.open(ThemeDialogComponent, {
      data: {},
    });
  }

  login() {
    this.store.dispatch(new Navigate(['/login']));
  }

  logout() {
    this.store.dispatch(new Navigate(['/logout']));
  }

  openCoreSettingsDialog() {
    let photometrySettings = this.store.selectSnapshot(WorkbenchState.getPhotometrySettings);
    let dialogRef = this.dialog.open(PhotSettingsDialogComponent, {
      width: '80vw',
      maxWidth: '900px',
      data: { ...photometrySettings },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.store.dispatch(new UpdatePhotometrySettings(result));
      }
    });
  }
}
