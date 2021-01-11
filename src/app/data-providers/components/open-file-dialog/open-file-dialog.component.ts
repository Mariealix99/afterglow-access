import { Component, OnInit, Inject, ViewChild, OnDestroy } from "@angular/core";
import { ImportAssets, ImportAssetsCompleted, ImportAssetsStatusUpdated } from "../../data-providers.actions";
import { Store, Actions, ofActionCompleted, ofActionDispatched } from "@ngxs/store";
import { Observable, Subject, BehaviorSubject } from "rxjs";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { map, distinctUntilChanged, tap, take, takeUntil } from "rxjs/operators";
import { LoadLibrary } from "../../../data-files/data-files.actions";
import { FocusFileListItem } from "../../../workbench/workbench.actions";
import { DataFilesState } from "../../../data-files/data-files.state";
import { DataProviderAsset } from "../../models/data-provider-asset";
import FileSystemItem from "devextreme/file_management/file_system_item";
import { AfterglowDataProviderService } from "../../../workbench/services/afterglow-data-providers";
import { BatchImportJob } from "../../../jobs/models/batch-import";

@Component({
  selector: "app-open-file-dialog",
  templateUrl: "./open-file-dialog.component.html",
  styleUrls: ["./open-file-dialog.component.scss"],
})
export class OpenFileDialogComponent implements OnInit, OnDestroy {
  selectedAssets$ = new BehaviorSubject<DataProviderAsset[]>([]);
  selectionIsValid$: Observable<boolean>;
  destroy$: Subject<boolean> = new Subject<boolean>();
  loading: boolean = false;
  progress: number = 0;

  constructor(
    private store: Store,
    private actions$: Actions,
    private dataProviderService: AfterglowDataProviderService,
    private dialogRef: MatDialogRef<OpenFileDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: any
  ) {
    this.selectionIsValid$ = this.selectedAssets$.pipe(
      map((items) => items && items.every((item) => !item.isDirectory) && items.length != 0),
      distinctUntilChanged()
    );
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onSelectedFileOpened($event) {
    let fileSystemItem: FileSystemItem = $event.file;
    if (!fileSystemItem) return;

    let asset: DataProviderAsset = fileSystemItem.dataItem;
    if (!asset || asset.isDirectory) return;

    this.open([asset]);
  }

  onErrorOccurred($event) {
    console.log($event);
  }

  openSelectedAssets() {
    let selectedAssets = this.selectedAssets$.value;
    if (!selectedAssets) return;
    selectedAssets = selectedAssets.filter((asset) => !asset.isDirectory);
    if (selectedAssets.length == 0) return;

    this.open(selectedAssets);
  }

  open(assets: DataProviderAsset[]) {
    if (assets && assets.length != 0) {
      let importCompleted$ = this.actions$.pipe(ofActionCompleted(ImportAssetsCompleted), takeUntil(this.destroy$), take(1));

      let importStatusUpdated$: Observable<ImportAssetsStatusUpdated> = this.actions$.pipe(
        ofActionDispatched(ImportAssetsStatusUpdated),
        takeUntil(importCompleted$),
        takeUntil(this.destroy$)
      );

      importStatusUpdated$.subscribe((action) => {
        let job: BatchImportJob = action.job;
        this.progress = job.state.progress;
        if (job.state.status == "pending" || job.state.status == "in_progress") {
          this.progress = job.state.progress;
        }
      });

      importCompleted$.subscribe((v) => {
        let action: ImportAssetsCompleted = v.action;

        this.store.dispatch(new LoadLibrary()).subscribe(() => {
          if (action.fileIds.length != 0) {
            let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[action.fileIds[0]];
            this.store.dispatch(new FocusFileListItem({ fileId: hdu.fileId, hduId: hdu.id }));
          }
        });
        this.dialogRef.close();
      });

      this.progress = 0;
      this.loading = true;
      this.store.dispatch(new ImportAssets(assets));
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}