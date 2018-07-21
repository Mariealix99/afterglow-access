import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { CentroidSettings } from '../../models/centroid-settings';
import { PhotSettings } from '../../../jobs/models/photometry';

@Component({
  selector: 'app-phot-settings-dialog',
  templateUrl: './phot-settings-dialog.component.html',
  styleUrls: ['./phot-settings-dialog.component.scss']
})
export class PhotSettingsDialogComponent implements OnInit {

  private settings: PhotSettings;

  constructor(public dialogRef: MatDialogRef<PhotSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PhotSettings) {

    this.settings = data;

  }

  private setCenteringBoxWidth(value) {
    this.settings.centroid_radius = value;
  }

  ngOnInit() {
  }

}
