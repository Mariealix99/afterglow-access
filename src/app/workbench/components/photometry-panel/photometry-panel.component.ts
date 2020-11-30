import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  OnInit,
  HostBinding,
  Input,
  EventEmitter,
  Output,
} from "@angular/core";

import * as moment from "moment";

import { MatCheckboxChange } from "@angular/material/checkbox";
import { MatDialog } from "@angular/material/dialog";
import {
  Select,
  Store,
  Actions,
  ofActionSuccessful,
  ofAction,
} from "@ngxs/store";
import { Observable, Subscription, combineLatest, BehaviorSubject } from "rxjs";
import {
  map,
  flatMap,
  tap,
  filter,
  catchError,
  mergeMap,
  distinctUntilChanged,
  withLatestFrom,
  switchMap,
} from "rxjs/operators";

import * as jStat from "jstat";
import { saveAs } from "file-saver/dist/FileSaver";

import {
  getCenterTime,
  getSourceCoordinates,
  DataFile,
  ImageHdu,
  Header,
} from "../../../data-files/models/data-file";
import { DmsPipe } from "../../../pipes/dms.pipe";
import { PhotometryPanelState } from "../../models/photometry-file-state";
import { PhotSettingsDialogComponent } from "../phot-settings-dialog/phot-settings-dialog.component";
import { SourceExtractionDialogComponent } from "../source-extraction-dialog/source-extraction-dialog.component";
import { Source, PosType } from "../../models/source";
import {
  PhotometryPanelConfig,
  BatchPhotometryFormData,
} from "../../models/workbench-state";
import { SelectionModel } from "@angular/cdk/collections";
import { CentroidSettings } from "../../models/centroid-settings";
import {
  PhotometryJob,
  PhotometryJobResult,
} from "../../../jobs/models/photometry";
import { Router } from "@angular/router";
import { MatButtonToggleChange } from "@angular/material/button-toggle";
import { WorkbenchState } from "../../workbench.state";
import {
  UpdatePhotometryPanelConfig,
  ExtractSources,
  PhotometerSources,
  RemovePhotDatas,
  RemoveAllPhotDatas,
} from "../../workbench.actions";
import {
  RemoveSources,
  UpdateSource,
} from "../../sources.actions";
import { PhotData } from "../../models/source-phot-data";
import { PhotometrySettings } from "../../models/photometry-settings";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { Papa } from "ngx-papaparse";
import { JobEntity, JobsState } from "../../../jobs/jobs.state";
import { datetimeToJd, jdToMjd } from "../../../utils/skynet-astro";
import { DatePipe } from "@angular/common";
import { SourceExtractionSettings } from "../../models/source-extraction-settings";

@Component({
  selector: "app-photometry-panel",
  templateUrl: "./photometry-panel.component.html",
  styleUrls: ["./photometry-panel.component.css"],
})
export class PhotometryPageComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  @Input("primaryHdu")
  set primaryHdu(primaryHdu: ImageHdu) {
    this.primaryHdu$.next(primaryHdu);
  }
  get primaryHdu() {
    return this.primaryHdu$.getValue();
  }
  private primaryHdu$ = new BehaviorSubject<ImageHdu>(null);

  @Input("primaryHeader")
  set primaryHeader(primaryHeader: Header) {
    this.primaryHeader$.next(primaryHeader);
  }
  get primaryHeader() {
    return this.primaryHeader$.getValue();
  }
  private primaryHeader$ = new BehaviorSubject<Header>(null);

  @Input("viewerId")
  set viewerId(viewerId: string) {
    this.viewerId$.next(viewerId);
  }
  get viewerId() {
    return this.viewerId$.getValue();
  }
  private viewerId$ = new BehaviorSubject<string>(null);

  @Input("state")
  set state(state: PhotometryPanelState) {
    this.state$.next(state);
  }
  get state() {
    return this.state$.getValue();
  }
  private state$ = new BehaviorSubject<PhotometryPanelState>(null);

  @Input("sources")
  set sources(sources: Source[]) {
    this.sources$.next(sources);
  }
  get sources() {
    return this.sources$.getValue();
  }
  private sources$ = new BehaviorSubject<Source[]>(null);

  @Input("hdus")
  set hdus(hdus: ImageHdu[]) {
    this.hdus$.next(hdus);
  }
  get hdus() {
    return this.hdus$.getValue();
  }
  private hdus$ = new BehaviorSubject<ImageHdu[]>(null);

  @Input("dataFileEntities")
  set dataFileEntities(dataFileEntities: {[id: string]: DataFile}) {
    this.dataFileEntities$.next(dataFileEntities);
  }
  get dataFileEntities() {
    return this.dataFileEntities$.getValue();
  }
  private dataFileEntities$ = new BehaviorSubject<{[id: string]: DataFile}>(null);

  @Input("config")
  set config(config: PhotometryPanelConfig) {
    this.config$.next(config);
  }
  get config() {
    return this.config$.getValue();
  }
  private config$ = new BehaviorSubject<PhotometryPanelConfig>(null);

  @Input() photometrySettings: PhotometrySettings;
  @Input() centroidSettings: CentroidSettings;
  @Input() sourceExtractionSettings: SourceExtractionSettings;

  @Output() configChange: EventEmitter<
    Partial<PhotometryPanelConfig>
  > = new EventEmitter();
  @Output() photometrySettingsChange: EventEmitter<
    Partial<PhotometrySettings>
  > = new EventEmitter();
  @Output() sourceExtractionSettingsChange: EventEmitter<
    Partial<SourceExtractionSettings>
  > = new EventEmitter();

  NUMBER_FORMAT: (v: any) => any = (v: number) => (v ? v : "N/A");
  DECIMAL_FORMAT: (v: any) => any = (v: number) => (v ? v.toFixed(2) : "N/A");
  SEXAGESIMAL_FORMAT: (v: any) => any = (v: number) =>
    v ? this.dmsPipe.transform(v) : "N/A";
  SourcePosType = PosType;

  tableData$: Observable<{ source: Source; data: PhotData }[]>;

  batchPhotJobEntity$: Observable<JobEntity>;
  batchPhotJob$: Observable<PhotometryJob>;
  batchPhotJobResult$: Observable<PhotometryJobResult>;
  batchFormDataSub: Subscription;
  photometryUpdater: Subscription;
  mergeError: string;
  sourceSelectionUpdater: Subscription;
  selectionModel = new SelectionModel<string>(true, []);

  batchPhotForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
  });
  batchPhotFormData$: Observable<BatchPhotometryFormData>;
  selectedImageHdus$: Observable<ImageHdu[]>;

  constructor(
    private dialog: MatDialog,
    private dmsPipe: DmsPipe,
    private datePipe: DatePipe,
    private papa: Papa,
    private actions$: Actions,
    private store: Store,
    private router: Router
  ) {
    this.tableData$ = combineLatest(
      this.sources$,
      this.state$.pipe(
        filter((state) => state !== null),
        map((state) => state.sourcePhotometryData)
      )
    ).pipe(
      filter(([sources]) => sources !== null),
      map(([sources, sourcePhotometryData]) => {
        return sources.map((source) => {
          return {
            source: source,
            data:
              source.id in sourcePhotometryData
                ? sourcePhotometryData[source.id]
                : null,
          };
        });
      })
    );
    this.batchPhotJobEntity$ = this.config$.pipe(
      map((s) => s.batchPhotJobId),
      withLatestFrom(this.store.select(JobsState.getEntities)),
      map(([jobId, jobEntities]) => jobEntities[jobId]),
      filter((job) => job != null && job != undefined)
    );

    this.batchPhotJob$ = this.batchPhotJobEntity$.pipe(
      map((entity) => entity.job as PhotometryJob)
    );

    this.batchPhotJobResult$ = this.batchPhotJobEntity$.pipe(
      map((entity) => entity.result as PhotometryJobResult)
    );

    this.batchPhotFormData$ = this.config$.pipe(
      filter((config) => config !== null),
      map((config) => config.batchPhotFormData),
      distinctUntilChanged(),
      tap((data) => {
        this.batchPhotForm.patchValue(data, { emitEvent: false });
      })
    );

    this.batchFormDataSub = this.batchPhotFormData$.subscribe();
    this.batchPhotForm.valueChanges.subscribe((value) => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(
        new UpdatePhotometryPanelConfig({
          batchPhotFormData: this.batchPhotForm.value,
        })
      );
      // }
    });

    this.selectedImageHdus$ = combineLatest(
      this.hdus$,
      this.batchPhotFormData$
    ).pipe(
      map(([hdus, data]) =>
        data.selectedHduIds.map((id) => hdus.find((f) => f.id == id))
      )
    );

    this.sourceSelectionUpdater = combineLatest(this.sources$, this.config$)
      .pipe(
        filter(([sources, config]) => sources !== null && config !== null),
        map(([sources, config]) =>
          sources
            .filter((s) => config.selectedSourceIds.includes(s.id))
            .map((s) => s.id)
        )
      )
      .subscribe((selectedSourceIds) => {
        this.selectionModel.clear();
        this.selectionModel.select(...selectedSourceIds);
      });

      this.photometryUpdater = this.tableData$
      .pipe(
        map((rows) => rows.filter((row) => row.data == null)),
        filter((rows) => rows.length != 0 && this.config.autoPhot),
        switchMap((rows) => {
          return this.store.dispatch(
            new PhotometerSources(
              rows.map((row) => row.source.id),
              [this.primaryHdu.id],
              this.photometrySettings,
              false
            )
          );
        })
      )
      .subscribe();
      // this.photometryUpdater = this.tableData$
      // .pipe(
      //   filter((sources) => sources && sources.length != 0 && this.config && this.config.autoPhot),
      //   map(sources => sources.map(s => s.id)),
      //   distinctUntilChanged(),
      //   switchMap((sourceIds) => {
      //     return this.store.dispatch(
      //       new PhotometerSources(
      //         sourceIds,
      //         [this.selectedFile.id],
      //         this.photometrySettings,
      //         false
      //       )
      //     );
      //   })
      // )
      // .subscribe();
  }

  ngOnInit() {}

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.batchFormDataSub.unsubscribe();
    this.sourceSelectionUpdater.unsubscribe();
    this.photometryUpdater.unsubscribe();
  }

  ngOnChanges() {}

  selectSources(sources: Source[]) {
    let selectedSourceIds = this.store.selectSnapshot(
      WorkbenchState.getPhotometryPanelConfig
    ).selectedSourceIds;

    this.store.dispatch(
      new UpdatePhotometryPanelConfig({
        selectedSourceIds: [
          ...selectedSourceIds,
          ...sources
            .filter((s) => !selectedSourceIds.includes(s.id))
            .map((s) => s.id),
        ],
      })
    );
  }

  deselectSources(sources: Source[]) {
    let idsToRemove = sources.map((s) => s.id);
    let selectedSourceIds = this.store
      .selectSnapshot(WorkbenchState.getPhotometryPanelConfig)
      .selectedSourceIds.filter((id) => !idsToRemove.includes(id));

    this.store.dispatch(
      new UpdatePhotometryPanelConfig({
        selectedSourceIds: selectedSourceIds,
      })
    );
  }

  toggleSource(source: Source) {
    if (this.selectionModel.isSelected(source.id)) {
      this.deselectSources([source]);
    } else {
      this.selectSources([source]);
    }
  }

  removeSelectedSources() {
    let selectedSourceIds = this.store.selectSnapshot(
      WorkbenchState.getPhotometryPanelConfig
    ).selectedSourceIds;
    this.store.dispatch(new RemoveSources(selectedSourceIds));
  }

  removeAllSources() {
    this.store.dispatch(new RemoveSources(this.sources.map((s) => s.id)));
  }

  mergeSelectedSources() {
    let selectedSourceIds = this.config.selectedSourceIds;
    let selectedSources = this.sources.filter((s) =>
      selectedSourceIds.includes(s.id)
    );
    this.mergeError = null;
    if (
      !selectedSources.every(
        (source) => source.posType == selectedSources[0].posType
      )
    ) {
      this.mergeError =
        "You cannot merge sources with different position types";
      return;
    }
    if (selectedSources.some((source) => source.pmEpoch == null)) {
      this.mergeError = "You can only merge sources which have epochs defined";
      return;
    }
    //verify unique epochs
    let sortedEpochs = selectedSources
      .map((source) => new Date(source.pmEpoch))
      .sort();
    for (let i = 0; i < sortedEpochs.length - 1; i++) {
      if (sortedEpochs[i + 1] == sortedEpochs[i]) {
        this.mergeError = "All source epochs must be unique when merging";
        return;
      }
    }
    let t0 = new Date(selectedSources[0].pmEpoch).getTime();
    let primaryCoord0 = selectedSources[0].primaryCoord;
    let secondaryCoord0 = selectedSources[0].secondaryCoord;
    let data = selectedSources.map((source) => {
      let centerSecondaryCoord =
        (source.secondaryCoord + secondaryCoord0) / 2.0;
      return [
        (new Date(source.pmEpoch).getTime() - t0) / 1000.0,
        (source.primaryCoord - primaryCoord0) *
          (source.posType == PosType.PIXEL
            ? 1
            : 15 * 3600 * Math.cos((centerSecondaryCoord * Math.PI) / 180.0)),
        (source.secondaryCoord - secondaryCoord0) *
          (source.posType == PosType.PIXEL ? 1 : 3600),
      ];
    });
    let x = data.map((d) => [1, d[0]]);
    let primaryY = data.map((d) => d[1]);
    let secondaryY = data.map((d) => d[2]);
    let primaryModel = jStat.models.ols(primaryY, x);
    let secondaryModel = jStat.models.ols(secondaryY, x);
    let primaryRate = primaryModel.coef[1];
    let secondaryRate = secondaryModel.coef[1];
    let positionAngle =
      (Math.atan2(primaryRate, secondaryRate) * 180.0) / Math.PI;
    positionAngle = positionAngle % 360;
    if (positionAngle < 0) positionAngle += 360;
    let rate = Math.sqrt(Math.pow(primaryRate, 2) + Math.pow(secondaryRate, 2));
    this.store.dispatch([
      new UpdateSource(selectedSources[0].id, {
        pm: rate,
        pmPosAngle: positionAngle,
      }),
      new RemoveSources(selectedSources.slice(1).map((s) => s.id)),
      new RemovePhotDatas(selectedSources[0].id),
    ]);
  }

  photometerAllSources(imageFile) {
    this.store.dispatch(new RemoveAllPhotDatas());
    this.store.dispatch(
      new PhotometerSources(
        this.sources.map((s) => s.id),
        [imageFile.id],
        this.photometrySettings,
        false
      )
    );
  }

  showSelectAll() {
    return this.sources && this.sources.length != 0;
  }

  isAllSelected() {
    const numSelected = this.selectionModel.selected.length;
    const numRows = this.sources.length;
    return numSelected === numRows;
  }

  exportSourceData(rows: Array<{ source: Source; data: PhotData }>) {
    let data = this.papa.unparse(
      rows.map((row) => {
        let time = row.data.time
          ? moment.utc(row.data.time, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
          : null;
        let pmEpoch = row.source.pmEpoch
          ? moment.utc(row.source.pmEpoch, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
          : null;
        // console.log(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), datetimeToJd(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()))
        let jd = time ? datetimeToJd(time) : null;
        return {
          ...row.source,
          ...row.data,
          time: time
            ? this.datePipe.transform(time, "yyyy-MM-dd HH:mm:ss.SSS")
            : null,
          pm_epoch: pmEpoch
            ? this.datePipe.transform(pmEpoch, "yyyy-MM-dd HH:mm:ss.SSS")
            : null,
          jd: jd,
          mjd: jd ? jdToMjd(jd) : null,
        };
      })
      // .sort((a, b) => (a.jd > b.jd ? 1 : -1))
    );
    var blob = new Blob([data], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `afterglow_sources.csv`);
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.store.dispatch(
        new UpdatePhotometryPanelConfig({
          selectedSourceIds: [],
        })
      );
    } else {
      this.store.dispatch(
        new UpdatePhotometryPanelConfig({
          selectedSourceIds: this.sources.map((s) => s.id),
        })
      );
    }
  }

  trackByFn(index: number, value: Source) {
    return value.id;
  }

  onAutoPhotChange($event) {
    this.store.dispatch(
      new UpdatePhotometryPanelConfig({
        autoPhot: $event.checked,
      })
    );
  }

  clearPhotDataFromAllFiles() {
    this.store.dispatch(new RemoveAllPhotDatas());
  }

  selectHdus(hdus: ImageHdu[]) {
    this.store.dispatch(
      new UpdatePhotometryPanelConfig({
        batchPhotFormData: {
          ...this.batchPhotForm.value,
          selectedHduIds: hdus.map((f) => f.id),
        },
      })
    );
  }

  batchPhotometer() {
    this.store.dispatch(
      new PhotometerSources(
        this.sources.map((s) => s.id),
        this.config.batchPhotFormData.selectedHduIds,
        this.photometrySettings,
        true
      )
    );
  }

  downloadBatchPhotData(result: PhotometryJobResult) {
    let data = this.papa.unparse(
      result.data.map((d) => {
        let time = d.time
          ? moment.utc(d.time, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
          : null;
        let pmEpoch = d.pm_epoch
          ? moment.utc(d.pm_epoch, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
          : null;
        // console.log(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), datetimeToJd(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()))
        let jd = time ? datetimeToJd(time) : null;
        return {
          ...d,
          time: time
            ? this.datePipe.transform(time, "yyyy-MM-dd HH:mm:ss.SSS")
            : null,
          pm_epoch: pmEpoch
            ? this.datePipe.transform(pmEpoch, "yyyy-MM-dd HH:mm:ss.SSS")
            : null,
          jd: jd,
          mjd: jd ? jdToMjd(jd) : null,
        };
      }),
      {
        columns: [
          "file_id",
          "id",
          "time",
          "jd",
          "mjd",
          "ra_hours",
          "dec_degs",
          "x",
          "y",
          "telescope",
          "filter",
          "exp_length",
          "mag",
          "mag_error",
          "flux",
          "flux_error",
          "pm_sky",
          "pm_epoch",
          "pm_pos_angle_sky",
        ],
      }
      // .sort((a, b) => (a.jd > b.jd ? 1 : -1))
    );
    var blob = new Blob([data], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `afterglow_photometry.csv`);

    // let sources = this.store.selectSnapshot(SourcesState.getEntities);
    // let data = this.store.selectSnapshot(PhotDataState.getSourcesPhotData).map(d => {
    //   return {
    //     ...sources[d.sourceId],
    //     ...d
    //   }
    // });
    // let blob = new Blob([this.papa.unparse(data)], { type: "text/plain;charset=utf-8" });
    // saveAs(blob, `afterglow_photometry.csv`);
  }

  openSourceExtractionDialog() {
    let dialogRef = this.dialog.open(SourceExtractionDialogComponent, {
      width: "500px",
      data: { ...this.sourceExtractionSettings },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.sourceExtractionSettingsChange.emit(result);
        this.store.dispatch([new ExtractSources(this.primaryHdu.id, this.viewerId, result)]);
      }
    });
  }

  openPhotometrySettingsDialog() {
    let dialogRef = this.dialog.open(PhotSettingsDialogComponent, {
      width: "600px",
      data: { ...this.photometrySettings },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.photometrySettingsChange.emit(result);
        this.store.dispatch(new RemoveAllPhotDatas());
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

  onCoordModeChange($event: MatButtonToggleChange) {
    this.configChange.emit({ coordMode: $event.value });
  }

  onCentroidClicksChange($event) {
    this.configChange.emit({ centroidClicks: $event.checked });
  }

  onShowSourcesFromAllFilesChange($event: MatCheckboxChange) {
    this.configChange.emit({ showSourcesFromAllFiles: $event.checked });
  }

  onShowSourceLabelsChange($event: MatCheckboxChange) {
    this.configChange.emit({ showSourceLabels: $event.checked });
  }
}
