import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { getPixel, getWidth, getHeight, DataFile, ImageHdu } from '../../../data-files/models/data-file';
import { Subject, timer } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { ZoomTo, ZoomBy, CenterRegionInViewport } from '../../workbench-file-states.actions';
import { CloseHdu } from '../../../data-files/hdus.actions';

@Component({
  selector: 'app-image-viewer-status-bar',
  templateUrl: './image-viewer-status-bar.component.html',
  styleUrls: ['./image-viewer-status-bar.component.css']
})
export class ImageViewerStatusBarComponent implements OnInit, OnChanges {
  @Input() hdu: ImageHdu;
  @Input() imageMouseX: number;
  @Input() imageMouseY: number;
  @Output() downloadSnapshot = new EventEmitter();

  raHours: number;
  decDegs: number;
  pixelValue: number;

  private zoomStepFactor: number = 0.75;
  private startZoomIn$ = new Subject<boolean>();
  private stopZoomIn$ = new Subject<boolean>();
  
  private startZoomOut$ = new Subject<boolean>();
  private stopZoomOut$ = new Subject<boolean>();


  constructor(private store: Store, private dialog: MatDialog) { }

  ngOnInit() {
  }

  ngOnChanges() {
    if(this.imageMouseX == null || this.imageMouseY == null || !this.hdu) {
      this.pixelValue = null;
      this.raHours = null;
      this.decDegs = null;
      return;
    }
    if(this.hdu.headerLoaded) {
      this.pixelValue = getPixel(this.hdu, this.imageMouseX, this.imageMouseY);
      if(this.hdu.wcs.isValid()) {
        let wcs = this.hdu.wcs;
        let raDec = wcs.pixToWorld([this.imageMouseX, this.imageMouseY]);
        this.raHours = raDec[0];
        this.decDegs = raDec[1];
      }
      else {
        this.raHours = null;
        this.decDegs = null;
      }
    }
    
  }

  onDownloadSnapshotClick() {
    this.downloadSnapshot.emit();
  }

  removeFromLibrary() {
    if(!this.hdu) return;
    let hduId = this.hdu.id;

    let dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: "300px",
      data: {
        message: "Are you sure you want to delete this file from your library?",
        confirmationBtn: {
          color: 'warn',
          label: 'Delete File'
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(new CloseHdu(hduId));
      }
    });

  }

  public startZoomIn() {
    timer(0, 125).pipe(
      takeUntil(this.stopZoomIn$),

    ).subscribe(t => {
      this.zoomIn();
    });
  }

  public stopZoomIn() {
    this.stopZoomIn$.next(true);
  }

  public startZoomOut() {
    timer(0, 125).pipe(
      takeUntil(this.stopZoomOut$),

    ).subscribe(t => {
      this.zoomOut();
    });
  }

  public stopZoomOut() {
    this.stopZoomOut$.next(true);
  }

  public zoomIn(imageAnchor: { x: number, y: number } = null) {
    this.zoomBy(1.0 / this.zoomStepFactor, imageAnchor);
  }

  public zoomOut(imageAnchor: { x: number, y: number } = null) {
    this.zoomBy(this.zoomStepFactor, imageAnchor);
  }

  public zoomTo(value: number) {
    this.store.dispatch(new ZoomTo(
      this.hdu.id,
      value,
      null
    ));
  }

  public zoomBy(factor: number, imageAnchor: { x: number, y: number } = null) {
    this.store.dispatch(new ZoomBy(
      this.hdu.id,
      factor,
      imageAnchor
    ));
  }

  public zoomToFit(padding: number = 0) {
    this.store.dispatch(new CenterRegionInViewport(
      this.hdu.id,
      { x: 1, y: 1, width: getWidth(this.hdu), height: getHeight(this.hdu) }
    ))
  }
}
