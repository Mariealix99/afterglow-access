import { Component, OnInit, HostBinding, Input } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject, Subject } from 'rxjs';

import { map, tap, takeUntil } from "rxjs/operators";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AlignFormData, WorkbenchTool, AligningPanelConfig } from '../../models/workbench-state';
import { MatSelectChange } from '@angular/material/select';
import { AlignmentJob, AlignmentJobResult } from '../../../jobs/models/alignment';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../workbench.state';
import { DataFilesState } from '../../../data-files/data-files.state';
import { SetActiveTool, SelectDataFile, CreateAlignmentJob, UpdateAligningPanelConfig } from '../../workbench.actions';
import { JobsState } from '../../../jobs/jobs.state';
import { DataFile } from '../../../data-files/models/data-file';

@Component({
  selector: 'app-aligning-panel',
  templateUrl: './aligning-panel.component.html',
  styleUrls: ['./aligning-panel.component.css']
})
export class AlignerPageComponent implements OnInit {
  @Input("selectedFile")
  set selectedFile(selectedFile: DataFile) {
    this.selectedFile$.next(selectedFile);
  }
  get selectedFile() {
    return this.selectedFile$.getValue();
  }
  private selectedFile$ = new BehaviorSubject<DataFile>(null);

  @Input("files")
  set files(files: DataFile[]) {
    this.files$.next(files);
  }
  get files() {
    return this.files$.getValue();
  }
  private files$ = new BehaviorSubject<DataFile[]>(null);

  @Input("config")
  set config(config: AligningPanelConfig) {
    this.config$.next(config);
  }
  get config() {
    return this.config$.getValue();
  }
  private config$ = new BehaviorSubject<AligningPanelConfig>(null);

  destroy$: Subject<boolean> = new Subject<boolean>();

  
  selectedImageFiles$: Observable<Array<DataFile>>;
  alignFormData$: Observable<AlignFormData>;
  activeImageIsSelected$: Observable<boolean>;
  activeImageHasWcs$: Observable<boolean>;
  alignmentJobRow$: Observable<{ job: AlignmentJob, result: AlignmentJobResult }>;

  alignForm = new FormGroup({
    selectedImageFileIds: new FormControl([], Validators.required),
    mode: new FormControl('', Validators.required),
    inPlace: new FormControl(false, Validators.required)
  });

  constructor(private store: Store, private router: Router) {
    this.alignFormData$ = store.select(WorkbenchState.getState).pipe(
      map(state => state.aligningPanelConfig.alignFormData),
      takeUntil(this.destroy$)
    );

    this.alignFormData$.subscribe(data => {
      this.alignForm.patchValue(data, { emitEvent: false });
    });

    this.selectedImageFiles$ = combineLatest(this.files$, this.alignFormData$).pipe(
      map(([allImageFiles, alignFormData]) => alignFormData.selectedImageFileIds.map(id => allImageFiles.find(f => f.id == id)))
    )

    this.alignForm.valueChanges.subscribe(value => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(new UpdateAligningPanelConfig({ alignFormData: this.alignForm.value }));
      // }
    })

    this.activeImageIsSelected$ = combineLatest(this.selectedFile$, this.selectedImageFiles$).pipe(
      map(([activeImageFile, selectedImageFiles]) => {
        return selectedImageFiles.find(f => activeImageFile && f.id == activeImageFile.id) != undefined;
      })
    )

    // TODO: LAYER
    this.activeImageHasWcs$ = this.selectedFile$.pipe(
      map(imageFile => imageFile != null && imageFile.hdus[0].headerLoaded && imageFile.hdus[0].wcs.isValid())
    )

    this.alignmentJobRow$ = combineLatest(store.select(WorkbenchState.getState), store.select(JobsState.getEntities)).pipe(
      map(([state, jobRowLookup]) => {
        if (!state.aligningPanelConfig.currentAlignmentJobId || !jobRowLookup[state.aligningPanelConfig.currentAlignmentJobId]) return null;
        return jobRowLookup[state.aligningPanelConfig.currentAlignmentJobId] as { job: AlignmentJob, result: AlignmentJobResult };
      })

    )
    
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    // Now let's also unsubscribe from the subject itself:
    this.destroy$.unsubscribe();
  }

  onActiveImageChange($event: MatSelectChange) {
    this.store.dispatch(new SelectDataFile($event.value));
  }

  selectImageFiles(imageFiles: DataFile[]) {
    this.store.dispatch(new UpdateAligningPanelConfig(
      {
        alignFormData: {
          ...this.alignForm.value,
          selectedImageFileIds: imageFiles.map(f => f.id)
        }
      }));
  }

  submit(data: AlignFormData) {
    this.store.dispatch(new CreateAlignmentJob())
  }
}
