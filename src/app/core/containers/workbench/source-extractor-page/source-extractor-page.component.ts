import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  OnInit,
  HostBinding,
  Input
} from "@angular/core";

import { MatDialog, MatCheckboxChange } from "@angular/material";
// import {
//   ITdDataTableSelectEvent,
//   ITdDataTableSelectAllEvent
// } from "@covalent/core";
import { Store } from "@ngrx/store";
import { Observable, Subscription, combineLatest } from "rxjs";
import {
  map,
  filter,
  catchError,
  mergeMap,
  distinctUntilChanged
} from "rxjs/operators";

import * as jStat from "jstat";
import { saveAs } from "file-saver/dist/FileSaver";

import * as fromRoot from "../../../../reducers";
import * as fromCore from "../../../reducers";
import * as jobActions from "../../../../jobs/actions/job";
import * as fromJobs from "../../../../jobs/reducers";
import * as workbenchActions from "../../../actions/workbench";
import * as sourceExtractorActions from "../../../actions/source-extractor";
import * as sourceActions from "../../../actions/source";

import {
  ImageFile,
  getWcs,
  getHasWcs,
  getCenterTime
} from "../../../../data-files/models/data-file";
import { DmsPipe } from "../../../../pipes/dms.pipe";
import {
  SourceExtractorFileState,
  SourceExtractorRegionOption
} from "../../../models/source-extractor-file-state";
import { SourceExtractorModeOption } from "../../../models/source-extractor-mode-option";
import { PhotSettingsDialogComponent } from "../../../components/phot-settings-dialog/phot-settings-dialog.component";
import { SourceExtractionSettingsDialogComponent } from "../../../components/source-extraction-settings-dialog/source-extraction-settings-dialog.component";
import { Source, PosType } from "../../../models/source";
import { Region } from "../../../models/region";
import { ImageFileState } from "../../../models/image-file-state";
import {
  ViewerGridCanvasMouseEvent,
  ViewerGridMarkerMouseEvent
} from "../workbench-viewer-grid/workbench-viewer-grid.component";
import { WorkbenchTool, WorkbenchState } from "../../../models/workbench-state";
import { DataSource } from "@angular/cdk/table";
import { CollectionViewer, SelectionModel } from "@angular/cdk/collections";
import { centroidPsf } from "../../../models/centroider";
import { CentroidSettings } from "../../../models/centroid-settings";
import { DataFileType } from "../../../../data-files/models/data-file-type";
import {
  PhotometryJob,
  PhotometryJobResult
} from "../../../../jobs/models/photometry";
import { JobType } from "../../../../jobs/models/job-types";
import { Astrometry } from "../../../../jobs/models/astrometry";
import { SourceId } from "../../../../jobs/models/source-id";
import { Papa } from "ngx-papaparse";
import { datetimeToJd, jdToMjd } from '../../../../lib/skynet-astro';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';

export class SourcesDataSource implements DataSource<Source> {
  sources$: Observable<Source[]>;
  sources: Source[] = [];
  sub: Subscription;

  constructor(private store: Store<fromRoot.State>) {
    this.sources$ = combineLatest(
      store.select(fromCore.getAllSources),
      store.select(fromCore.workbench.getActiveFile),
      store.select(fromCore.workbench.getShowAllSources)
    ).pipe(
      map(([sources, activeFile, showAllSources]) => {
        if (!activeFile) return [];
        return sources.filter(source => {
          return source.fileId == activeFile.id || showAllSources;
        });
      })
    );
  }

  connect(collectionViewer: CollectionViewer): Observable<Source[]> {
    this.sub = this.sources$.subscribe(sources => {
      this.sources = sources;
    });

    return this.sources$;
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.sub.unsubscribe();
  }
}

@Component({
  selector: "app-source-extractor-page",
  templateUrl: "./source-extractor-page.component.html",
  styleUrls: ["./source-extractor-page.component.css"]
})
export class SourceExtractorPageComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  @HostBinding("class") @Input("class") classList: string =
    "fx-workbench-outlet";
    inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  selectedSourceActionError: string = null;
  selectedSources$: Observable<Source[]>;
  selectedSources: Array<Source> = [];
  activeImageFile$: Observable<ImageFile>;
  selectedImageFiles$: Observable<Array<ImageFile>>;
  activeImageFileState$: Observable<ImageFileState>;
  showAllSources$: Observable<boolean>;
  extractionJobRows$: Observable<
    Array<{ job: PhotometryJob; result: PhotometryJobResult }>
  >;

  showConfig$: Observable<boolean>;
  activeSourceExtractorFileState$: Observable<SourceExtractorFileState>;
  workbenchState$: Observable<WorkbenchState>;
  centroidSettings$: Observable<CentroidSettings>;
  region$: Observable<Region> = null;
  filteredSources$: Observable<Source[]>;

  activeImageFile: ImageFile;
  selectedImageFiles: Array<ImageFile>;
  activeSourceExtractorFileState: SourceExtractorFileState;
  workbenchState: WorkbenchState;
  SourceExtractorModeOption = SourceExtractorModeOption;
  SourceExtractorRegionOption = SourceExtractorRegionOption;
  subs: Subscription[] = [];
  pixelCoordView: string = "pixel";
  NUMBER_FORMAT: (v: any) => any = (v: number) => (v ? v : "N/A");
  DECIMAL_FORMAT: (v: any) => any = (v: number) => (v ? v.toFixed(2) : "N/A");
  SEXAGESIMAL_FORMAT: (v: any) => any = (v: number) =>
    v ? this.dmsPipe.transform(v) : "N/A";
  SourcePosType = PosType;

  dataSource: SourcesDataSource;
  selectionModel = new SelectionModel<string>(true, []);

  private regionOptions = [
    { label: "Entire Image", value: SourceExtractorRegionOption.ENTIRE_IMAGE },
    { label: "Current View", value: SourceExtractorRegionOption.VIEWPORT },
    {
      label: "Sonification Region",
      value: SourceExtractorRegionOption.SONIFIER_REGION
    }
  ];

  constructor(
    private store: Store<fromRoot.State>,
    public dialog: MatDialog,
    private dmsPipe: DmsPipe,
    private papa: Papa,
    private decimalPipe: DecimalPipe,
    private datePipe: DatePipe, router: Router
  ) {
    this.fullScreenPanel$ = this.store.select(fromCore.workbench.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(fromCore.workbench.getInFullScreenMode);
    this.dataSource = new SourcesDataSource(store);

    this.selectedSources$ = store.select(fromCore.getSelectedSources);
    this.subs.push(
      this.selectedSources$.subscribe(
        sources => (this.selectedSources = sources)
      )
    );
    this.showAllSources$ = store.select(fromCore.workbench.getShowAllSources);

    this.activeImageFile$ = store.select(fromCore.workbench.getActiveFile);
    this.selectedImageFiles$ = store
      .select(fromCore.workbench.getSelectedFiles)
      .pipe(
        map(
          files =>
            files.filter(file => file.type == DataFileType.IMAGE) as Array<
              ImageFile
            >
        )
      );

    this.activeImageFileState$ = store.select(
      fromCore.workbench.getActiveFileState
    );
    this.workbenchState$ = store
      .select(fromCore.getWorkbenchState)
      .pipe(filter(state => state != null));
    this.activeSourceExtractorFileState$ = this.activeImageFileState$.pipe(
      filter(state => state != null),
      map(state => state.sourceExtractor),
      filter(v => v != null)
    );
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);
    this.centroidSettings$ = this.workbenchState$.pipe(
      map(state => state && state.centroidSettings)
    );

    this.extractionJobRows$ = combineLatest(
      store.select(fromJobs.getAllJobs).pipe(
        map(
          rows =>
            rows.filter(row => row.job.type == JobType.Photometry) as Array<{
              job: PhotometryJob;
              result: PhotometryJobResult;
            }>
        )
      ),
      this.activeImageFile$
    ).pipe(
      map(([rows, activeImageFile]) =>
        activeImageFile
          ? rows
              .filter(row =>
                row.job.file_ids.includes(parseInt(activeImageFile.id))
              )
              .sort((a, b) => {
                if (a.job.id == b.job.id) return 0;
                return a.job.id > b.job.id ? -1 : 1;
              })
          : []
      )
    );

    this.region$ = this.activeSourceExtractorFileState$.pipe(
      distinctUntilChanged((a, b) => {
        return a && b && a.region == b.region;
      }),
      map(state => {
        if (!state) return null;
        return state.region;
      })
    );

    this.subs.push(
      this.activeImageFile$.subscribe(imageFile => {
        this.activeImageFile = imageFile;
      })
    );
    this.subs.push(
      this.selectedImageFiles$.subscribe(imageFiles => {
        this.selectedImageFiles = imageFiles;
      })
    );
    this.subs.push(
      this.activeSourceExtractorFileState$.subscribe(
        state => (this.activeSourceExtractorFileState = state)
      )
    );
    this.subs.push(
      this.workbenchState$.subscribe(state => (this.workbenchState = state))
    );

    this.subs.push(
      this.selectedSources$.subscribe(selectedSources => {
        this.selectionModel.clear();
        this.selectionModel.select(...selectedSources.map(source => source.id));
      })
    );

    this.store.dispatch(
      new workbenchActions.SetActiveTool({
        tool: WorkbenchTool.SOURCE_EXTRACTOR
      })
    );

    this.store.dispatch(
      new workbenchActions.SetLastRouterPath({path: router.url})
    )
  }

  ngOnInit() {
    this.store.dispatch(new workbenchActions.EnableMultiFileSelection());
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngOnChanges() {}

  setModeOption(value) {
    this.store.dispatch(
      new workbenchActions.SetSourceExtractionMode({ mode: value })
    );
  }

  setRegionOption(value) {
    this.store.dispatch(
      new sourceExtractorActions.UpdateFileState({
        file: this.activeImageFile,
        changes: { regionOption: value }
      })
    );
  }

  openPhotSettings() {
    let dialogRef = this.dialog.open(PhotSettingsDialogComponent, {
      width: "600px",
      data: { ...this.workbenchState.photSettings }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(
          new workbenchActions.UpdatePhotSettings({ changes: result.phot })
        );
        this.store.dispatch(
          new workbenchActions.UpdateCentroidSettings({
            changes: result.centroid
          })
        );
      }
    });
  }

  openSourceExtractionSettings() {
    let dialogRef = this.dialog.open(SourceExtractionSettingsDialogComponent, {
      width: "500px",
      data: { ...this.workbenchState.sourceExtractionSettings }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(
          new workbenchActions.UpdateSourceExtractionSettings({
            changes: result
          })
        );
      }
    });
  }

  // onSelectedRowChanges($event: ITdDataTableSelectEvent) {
  //   if ($event.selected) {
  //     this.selectSources([$event.row]);
  //   } else {
  //     this.deselectSources([$event.row]);
  //   }
  // }

  onShowAllSourcesChange($event: MatCheckboxChange) {
    this.store.dispatch(
      new workbenchActions.SetShowAllSources({ showAllSources: $event.checked })
    );
  }

  // onSelectAllRows($event: ITdDataTableSelectAllEvent) {
  //   if ($event.selected) {
  //     this.selectSources($event.rows);
  //   } else {
  //     this.deselectSources($event.rows);
  //   }
  // }

  selectSources(sources: Source[]) {
    this.store.dispatch(new sourceActions.SelectSources({ sources: sources }));
  }

  deselectSources(sources: Source[]) {
    this.store.dispatch(
      new sourceActions.DeselectSources({ sources: sources })
    );
  }

  toggleSource(source: Source) {
    if (this.selectionModel.isSelected(source.id)) {
      this.deselectSources([source]);
    } else {
      this.selectSources([source]);
    }
  }

  findSources() {
    this.store.dispatch(
      new sourceExtractorActions.ExtractSources({ file: this.activeImageFile })
    );
  }

  onMarkerClick($event: ViewerGridMarkerMouseEvent) {
    if ($event.mouseEvent.altKey) return;

    let source = this.dataSource.sources.find(
      source => $event.marker.data && source.id == $event.marker.data["id"]
    );
    if (!source) return;

    let sourceSelected = this.selectedSources.includes(source);
    // if(!sourceSelected) {
    //   // select the source
    //   this.selectSources($event.targetFile, [source]);
    // }
    // else {
    //   // deselect the source
    //   this.deselectSources($event.targetFile, [source]);
    // }
    if ($event.mouseEvent.ctrlKey) {
      if (!sourceSelected) {
        // select the source
        this.selectSources([source]);
      } else {
        // deselect the source
        this.deselectSources([source]);
      }
    } else {
      this.store.dispatch(
        new sourceActions.SetSourceSelection({ sources: [source] })
      );
    }
    $event.mouseEvent.stopImmediatePropagation();
    $event.mouseEvent.preventDefault();
  }

  onImageClick($event: ViewerGridCanvasMouseEvent) {
    if ($event.hitImage) {
      if (
        this.workbenchState.sourceExtractorModeOption ==
          SourceExtractorModeOption.MOUSE &&
        (this.selectedSources.length == 0 || $event.mouseEvent.altKey)
      ) {
        let primaryCoord = $event.imageX;
        let secondaryCoord = $event.imageY;
        let posType = PosType.PIXEL;

        let centroidClicks = true;
        if (centroidClicks) {
          let result = centroidPsf(
            this.activeImageFile,
            primaryCoord,
            secondaryCoord,
            this.workbenchState.centroidSettings.psfCentroiderSettings
          );
          primaryCoord = result.x;
          secondaryCoord = result.y;
        }
        if (getHasWcs(this.activeImageFile)) {
          let wcs = getWcs(this.activeImageFile);
          let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
          primaryCoord = raDec[0];
          secondaryCoord = raDec[1];
          posType = PosType.SKY;
        }

        let source: Source = {
          id: null,
          label: "",
          objectId: null,
          fileId: this.activeImageFile.id,
          primaryCoord: primaryCoord,
          secondaryCoord: secondaryCoord,
          posType: posType,
          pm: null,
          pmPosAngle: null,
          pmEpoch: getCenterTime(this.activeImageFile)
        };
        this.store.dispatch(
          new sourceActions.AddSources({ sources: [source] })
        );
      } else {
        this.store.dispatch(
          new sourceActions.SetSourceSelection({ sources: [] })
        );
      }
    }
  }

  removeSelectedSources() {
    this.store.dispatch(
      new sourceActions.RemoveSources({ sources: this.selectedSources })
    );
  }

  mergeSelectedSources() {
    this.selectedSourceActionError = null;
    if (
      !this.selectedSources.every(
        source => source.posType == this.selectedSources[0].posType
      )
    ) {
      this.selectedSourceActionError =
        "You cannot merge sources with different position types";
      return;
    }

    if (this.selectedSources.some(source => source.pmEpoch == null)) {
      this.selectedSourceActionError =
        "You can only merge sources which have epochs defined";
      return;
    }

    //verify unique epochs
    let sortedEpochs = this.selectedSources
      .map(source => source.pmEpoch)
      .sort();
    for (let i = 0; i < sortedEpochs.length - 1; i++) {
      if (sortedEpochs[i + 1] == sortedEpochs[i]) {
        this.selectedSourceActionError =
          "All source epochs must be unique when merging";
        return;
      }
    }

    let t0 = this.selectedSources[0].pmEpoch.getTime();
    let primaryCoord0 = this.selectedSources[0].primaryCoord;
    let secondaryCoord0 = this.selectedSources[0].secondaryCoord;
    let data = this.selectedSources.map(source => {
      let centerSecondaryCoord =
        (source.secondaryCoord + secondaryCoord0) / 2.0;
      return [
        (source.pmEpoch.getTime() - t0) / 1000.0,
        (source.primaryCoord - primaryCoord0) *
          (source.posType == PosType.PIXEL
            ? 1
            : 15 * 3600 * Math.cos((centerSecondaryCoord * Math.PI) / 180.0)),
        (source.secondaryCoord - secondaryCoord0) *
          (source.posType == PosType.PIXEL ? 1 : 3600)
      ];
    });

    let x = data.map(d => [1, d[0]]);
    let primaryY = data.map(d => d[1]);
    let secondaryY = data.map(d => d[2]);

    let primaryModel = jStat.models.ols(primaryY, x);
    let secondaryModel = jStat.models.ols(secondaryY, x);

    let primaryRate = primaryModel.coef[1];
    let secondaryRate = secondaryModel.coef[1];
    let positionAngle =
      (Math.atan2(primaryRate, secondaryRate) * 180.0) / Math.PI;
    positionAngle = positionAngle % 360;
    if (positionAngle < 0) positionAngle += 360;
    let rate = Math.sqrt(Math.pow(primaryRate, 2) + Math.pow(secondaryRate, 2));

    this.store.dispatch(
      new sourceActions.UpdateSource({
        sourceId: this.selectedSources[0].id,
        changes: { pm: rate, pmPosAngle: positionAngle }
      })
    );
    this.store.dispatch(
      new sourceActions.RemoveSources({
        sources: this.selectedSources.slice(1)
      })
    );

    // let primaryResult = regression.linear(primaryCoordData, { precision: 6 });
    // let secondaryResult = regression.linear(secondaryCoordData, { precision: 6 });

    // console.log(primaryResult, secondaryResult);

    // let file = this.referenceFiles[this.source.fileId] as ImageFile;
    //   let centerTime = getCenterTime(file);
    //   let referenceFile = this.referenceFiles[this.referenceSource.fileId] as ImageFile;
    //   let referenceCenterTime = getCenterTime(referenceFile);
    //   let deltaSecs = (referenceCenterTime.getTime() - centerTime.getTime())/1000.0;
    //   if (this.pixelCoordView == 'sky') {

    //     let centerDecDegs = (this.referenceSource.decDegs + this.source.decDegs) / 2;
    //     let deltaRaArcsecs = (this.referenceSource.raHours - this.source.raHours) * 15 * 3600 * Math.cos(centerDecDegs * Math.PI / 180.0);
    //     let deltaDecArcsecs = (this.referenceSource.decDegs - this.source.decDegs) * 3600;
    //     let positionAngleDegs = Math.atan2(deltaDecArcsecs, -deltaRaArcsecs) * 180.0 / Math.PI - 90;
    //     positionAngleDegs = positionAngleDegs % 360;
    //     if (positionAngleDegs < 0) positionAngleDegs += 360;

    //     let wcs = getWcs(file);
    //     let pixelPmPosAngle = positionAngleDegs+wcs.positionAngle()
    //     pixelPmPosAngle = pixelPmPosAngle % 360;
    //     if (pixelPmPosAngle < 0) pixelPmPosAngle += 360;

    //     console.log(wcs.positionAngle(), positionAngleDegs, pixelPmPosAngle);

    //     this.source = {
    //       ...this.source,
    //       skyPm: Math.sqrt(Math.pow(deltaRaArcsecs, 2) + Math.pow(deltaDecArcsecs, 2))/deltaSecs,
    //       skyPmPosAngle: positionAngleDegs,
    //       pixelPm: null,
    //       pixelPmPosAngle: pixelPmPosAngle
    //     }
    //   }
    //   else {
    //     let deltaX = (this.referenceSource.x - this.source.x);
    //     let deltaY = (this.referenceSource.y - this.source.y);
    //     let positionAngleDegs = Math.atan2(deltaY, -deltaX) * 180.0 / Math.PI - 90;
    //     console.log(deltaX, deltaY, positionAngleDegs);
    //     positionAngleDegs = positionAngleDegs % 360;
    //     if (positionAngleDegs < 0) positionAngleDegs += 360;
    //     console.log(positionAngleDegs);
    //     this.source = {
    //       ...this.source,
    //       pixelPm: Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2))/deltaSecs,
    //       pixelPmPosAngle: positionAngleDegs,
    //       skyPm: null,
    //       skyPmPosAngle: null
    //     }
    //   }
  }

  photometerSelectedSources() {
    let job: PhotometryJob = {
      type: JobType.Photometry,
      id: null,
      file_ids: this.selectedImageFiles.map(file => parseInt(file.id)),
      sources: this.selectedSources.map((source, index) => {
        let x = null;
        let y = null;
        let pmPixel = null;
        let pmPosAnglePixel = null;
        let raHours = null;
        let decDegs = null;
        let pmSky = null;
        let pmPosAngleSky = null;

        if (source.posType == PosType.PIXEL) {
          x = source.primaryCoord;
          y = source.secondaryCoord;
          pmPixel = source.pm;
          pmPosAnglePixel = source.pmPosAngle;
        } else {
          raHours = source.primaryCoord;
          decDegs = source.secondaryCoord;
          pmSky = source.pm;
          if (pmSky) pmSky /= 3600.0;
          pmPosAngleSky = source.pmPosAngle;
        }
        return {
          id: source.id,
          pm_epoch: source.pmEpoch ? source.pmEpoch.toISOString() : null,
          x: x,
          y: y,
          pm_pixel: pmPixel,
          pm_pos_angle_pixel: pmPosAnglePixel,
          ra_hours: raHours,
          dec_degs: decDegs,
          pm_sky: pmSky,
          pm_pos_angle_sky: pmPosAngleSky
        } as Astrometry & SourceId;
      }),
      settings: this.workbenchState.photSettings
    };

    this.store.dispatch(new jobActions.CreateJob({ job: job }));
  }

  downloadPhotometry(row: { job: PhotometryJob; result: PhotometryJobResult }) {
    let data = this.papa.unparse(row.result.data.map(d => {
      let time = d.time ? new Date(d.time) : null;
      let pmEpoch = d.pm_epoch ? new Date(d.pm_epoch) : null;
      let jd = time ? datetimeToJd(time.getUTCFullYear(), time.getUTCMonth(), time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()) : null
      return {
        ...d,
        time: time ? this.datePipe.transform(time, 'yyyy-MM-dd HH:mm:ss.SSS') : null,
        pm_epoch: pmEpoch ? this.datePipe.transform(pmEpoch, 'yyyy-MM-dd HH:mm:ss.SSS') : null,
        jd: jd,
        mjd: jd ? jdToMjd(jd) : null
      }
    }));
    var blob = new Blob([data], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `afterglow_photometry_${row.job.id}.csv`);
  }

  setSourceProperMotion(source: Source) {
    // let dialogRef = this.dialog.open(ProperMotionDialogComponent, {
    //   width: '600px',
    //   data: { source: { ...source } }
    // });
    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     // this.store.dispatch(new sourceExtractorActions.UpdateSource({
    //     //   file: this.activeImageFile, sourceId: source.id, changes: {
    //     //     skyPm: result.skyPm,
    //     //     skyPmPosAngle: result.skyPmPosAngle,
    //     //     pixelPm: result.pixelPm,
    //     //     pixelPmPosAngle: result.pixelPmPosAngle
    //     //   }
    //     // }));
    //   }
    // });
  }

  showSelectAll() {
    return this.dataSource.sources && this.dataSource.sources.length != 0;
  }

  isAllSelected() {
    const numSelected = this.selectionModel.selected.length;
    const numRows = this.dataSource.sources.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.store.dispatch(
        new sourceActions.SetSourceSelection({ sources: [] })
      );
    } else {
      this.store.dispatch(
        new sourceActions.SetSourceSelection({
          sources: this.dataSource.sources
        })
      );
    }
  }

  trackByFn(index: number, value: Source) {
    return value.id;
  }

  onSourceLabelChange($event, source: Source) {
    this.store.dispatch(
      new sourceExtractorActions.SetSourceLabel({
        file: this.activeImageFile,
        source: source,
        label: $event
      })
    );
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(
      new workbenchActions.UpdateCentroidSettings({
        changes: { centroidClicks: $event.checked }
      })
    );
  }
}
