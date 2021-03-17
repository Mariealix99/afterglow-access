import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  ViewChild,
  TemplateRef,
  ViewContainerRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Observable, combineLatest, fromEvent, BehaviorSubject } from 'rxjs';
import { map, filter, take, tap } from 'rxjs/operators';
import { isImageViewer, isTableViewer, IViewer } from '../../models/viewer';

import { DataFile, getWidth, getHeight, ImageHdu, IHdu } from '../../../data-files/models/data-file';
import { CanvasMouseEvent, CanvasMouseDragEvent } from '../../components/pan-zoom-canvas/pan-zoom-canvas.component';
import { MarkerMouseEvent } from '../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { Subscription } from 'rxjs';
import { ViewMode } from '../../models/view-mode';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../workbench.state';
import { DataFilesState } from '../../../data-files/data-files.state';
import { SetFocusedViewer, CloseViewer, KeepViewerOpen, SplitViewerPanel, MoveViewer } from '../../workbench.actions';
import { MatMenuTrigger } from '@angular/material/menu';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { IWorkbenchHduState } from '../../models/workbench-file-state';
import { CenterRegionInViewport, ZoomBy } from '../../../data-files/data-files.actions';

export interface ViewerCanvasMouseEvent extends CanvasMouseEvent {
  viewerId: string;
  viewer: IViewer;
}

export interface ViewerCanvasMouseDragEvent extends CanvasMouseDragEvent {
  viewerId: string;
  viewer: IViewer;
}

export interface ViewerMarkerMouseEvent extends MarkerMouseEvent {
  viewerId: string;
  viewer: IViewer;
}

@Component({
  selector: 'app-workbench-viewer-panel',
  templateUrl: './workbench-viewer-panel.component.html',
  styleUrls: ['./workbench-viewer-panel.component.css'],
})
export class WorkbenchViewerPanelComponent implements OnInit, OnChanges {
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };
  mouseOverCloseViewerId: string = null;

  onContextMenu(event: MouseEvent, viewer: IViewer) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { viewer: viewer };
    this.contextMenu.menu.focusFirstItem('mouse');
    this.contextMenu.openMenu();
  }

  moveToOtherView(viewerId: string) {
    this.store.dispatch(new SplitViewerPanel(viewerId));
  }

  ViewMode = ViewMode;
  isImageViewer = isImageViewer;
  isTableViewer = isTableViewer;

  @Input('viewers')
  set viewers(viewers: IViewer[]) {
    this.viewers$.next(viewers);
  }
  get viewers() {
    return this.viewers$.getValue();
  }
  viewers$ = new BehaviorSubject<IViewer[]>([]);

  @Input() id: string;
  @Input() selectedViewerId: string;
  @Input() hasFocus: boolean;

  @Output() onImageClick = new EventEmitter<ViewerCanvasMouseEvent>();
  @Output() onImageMouseMove = new EventEmitter<ViewerCanvasMouseEvent>();
  @Output() onImageMouseDown = new EventEmitter<ViewerCanvasMouseEvent>();
  @Output() onImageMouseUp = new EventEmitter<ViewerCanvasMouseEvent>();
  @Output()
  onImageMouseDragStart = new EventEmitter<ViewerCanvasMouseDragEvent>();
  @Output() onImageMouseDrag = new EventEmitter<ViewerCanvasMouseDragEvent>();
  @Output()
  onImageMouseDragEnd = new EventEmitter<ViewerCanvasMouseDragEvent>();
  @Output() onMarkerClick = new EventEmitter<ViewerMarkerMouseEvent>();
  @Output() onFileClose = new EventEmitter<string>();
  @Output() onFileSave = new EventEmitter<string>();

  selectedViewerIndex = 0;

  // viewers$: Observable<Viewer[]>;
  // viewMode$: Observable<ViewMode>;
  // activeViewerIndex$: Observable<number>;

  hduEntities$: Observable<{ [id: string]: IHdu }>;
  fileEntities$: Observable<{ [id: string]: DataFile }>;
  hduStates$: Observable<{ [id: string]: IWorkbenchHduState }>;
  dropListConnections$: Observable<string[]>;
  subs: Subscription[] = [];
  // activeViewerIndex: number;
  mouseDownActiveViewerId: string;
  zoomStepFactor: number = 0.75;

  // private get focusedViewer() {
  //   let focusedViewerId = this.primaryViewerHasFocus ? this.selectedPrimaryViewerId : this.selectedSecondaryViewerId;
  //   return this.viewers.find(v => v.viewerId == focusedViewerId);
  // }

  constructor(private store: Store, public viewContainerRef: ViewContainerRef) {
    this.hduEntities$ = this.store.select(DataFilesState.getHduEntities);
    this.fileEntities$ = this.store.select(DataFilesState.getFileEntities);
    this.hduStates$ = this.store.select(WorkbenchState.getHduStateEntities);
    this.dropListConnections$ = this.store.select(WorkbenchState.getViewerPanelIds);
  }

  public getTabLabel(viewer: IViewer) {
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let file = fileEntities[viewer.fileId];
    if (!file) return '';

    let filename = file.name;
    if (viewer.hduId) {
      let hdu = hduEntities[viewer.hduId];
      if (!hdu) return '';

      if (file.hduIds.length > 1) {
        return hdu.name ? hdu.name : `${file.name} - Layer ${file.hduIds.indexOf(hdu.id)}`;
      }
    } else if (file.hduIds.length > 1) {
      filename += ` [Composite]`;
    }
    return filename;
  }

  // public zoomIn(hduId: string, imageAnchor: { x: number; y: number } = null) {
  //   this.zoomBy(hduId, 1.0 / this.zoomStepFactor, imageAnchor);
  // }

  // public zoomOut(hduId: string, imageAnchor: { x: number; y: number } = null) {
  //   this.zoomBy(hduId, this.zoomStepFactor, imageAnchor);
  // }

  // TODO: LAYER
  // public zoomBy(
  //   fileId: string,
  //   factor: number,
  //   imageAnchor: { x: number; y: number } = null
  // ) {
  //   this.store.dispatch(new ZoomBy(fileId, factor, imageAnchor));
  // }

  // public zoomToFit(hduId: string, padding: number = 0) {
  //   // TODO: LAYER
  //   let hdus = this.store.selectSnapshot(DataFilesState.getHduEntities);
  //   let hdu = hdus[hduId] as ImageHdu;
  //   let imageData =
  //   if (hdu) {
  //     this.store.dispatch(
  //       new CenterRegionInViewport(hduId, {
  //         x: 1,
  //         y: 1,
  //         width: getWidth(hdu),
  //         height: getHeight(hdu),
  //       })
  //     );
  //   }
  // }

  // public zoomTo(hduId: string, value: number) {
  //   // TODO: LAYER
  //   this.store.dispatch(new ZoomTo(hduId, value, null));
  // }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedViewerId || changes.viewers) {
      let nextSelectedViewerIndex = this.viewers
        .filter((viewer) => viewer != null)
        .map((viewer) => viewer.id)
        .indexOf(this.selectedViewerId);
      if (this.selectedViewerIndex != nextSelectedViewerIndex) {
        setTimeout(() => {
          this.selectedViewerIndex = nextSelectedViewerIndex;
        });
      }
    }
  }

  ngOnDestroy() {}

  viewerTrackByFn(index, item: IViewer) {
    // using the viewer's unique ID causes problems when the viewers are reordered.
    // Example,  open three viewers,  split one viewer to the right then drag a second viewer into the right panel.
    // The right panel's tab group shows the correct selected index but it does not detect that the viewer at that index
    // has changed and so it does not updatae the tab content.
    // return item.viewerId;
    return `${item.id}-${index}`;
  }

  closeViewer(viewerId: string) {
    this.store.dispatch(new CloseViewer(viewerId));
  }

  closeOtherViewers(viewerId: string) {
    this.store.dispatch([
      this.viewers.filter((viewer) => viewer.id != viewerId).map((viewer) => new CloseViewer(viewer.id)),
    ]);
  }

  closeViewersToTheRight(viewerId: string) {
    let viewerIds = this.viewers.map((viewer) => viewer.id);
    let index = viewerIds.indexOf(viewerId);
    if (index != -1) {
      let viewerIdsToClose = viewerIds.slice(index + 1, viewerIds.length);
      this.store.dispatch(viewerIdsToClose.map((id) => new CloseViewer(id)));
    }
  }

  closeAllViewers() {
    let viewerIds = this.viewers.map((viewer) => viewer.id);
    this.store.dispatch(viewerIds.map((id) => new CloseViewer(id)));
  }

  keepViewerOpen(viewerId: string) {
    this.store.dispatch(new KeepViewerOpen(viewerId));
  }

  setFocusedViewer($event: Event, viewerId: string, viewer: IViewer) {
    this.mouseDownActiveViewerId = this.selectedViewerId;
    if (viewerId != this.selectedViewerId || !this.hasFocus) {
      this.store.dispatch(new SetFocusedViewer(viewerId));
      $event.preventDefault();
      $event.stopImmediatePropagation();
    }
  }

  handleImageMouseMove($event: CanvasMouseEvent, viewerId: string, viewer: IViewer) {
    this.onImageMouseMove.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  handleImageMouseDown($event: CanvasMouseEvent, viewerId: string, viewer: IViewer) {
    this.onImageMouseDown.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  handleImageMouseUp($event: CanvasMouseEvent, viewerId: string, viewer: IViewer) {
    this.onImageMouseUp.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  handleImageMouseDragStart($event: CanvasMouseDragEvent, viewerId: string, viewer: IViewer) {
    this.onImageMouseDragStart.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  handleImageMouseDrag($event: CanvasMouseDragEvent, viewerId: string, viewer: IViewer) {
    this.onImageMouseDrag.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  handleImageMouseDragEnd($event: CanvasMouseDragEvent, viewerId: string, viewer: IViewer) {
    this.onImageMouseDragEnd.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  handleImageClick($event: CanvasMouseEvent, viewerId: string, viewer: IViewer) {
    // if (viewerId != this.mouseDownActiveViewerId) return;
    this.onImageClick.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  handleMarkerClick($event: MarkerMouseEvent, viewerId: string, viewer: IViewer) {
    // if (viewerId != this.mouseDownActiveViewerId) return;

    this.onMarkerClick.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  onSelectedViewerIndexChange(index) {
    // can't use this since it fires for both programmatic changes as well as user intiiated changes
    // use the click and mouse down events on the tab label for now until a better solution can be found
    // example: if the user drags the currently focused tab to a different panel,  the state action handler
    // will set focus to the tab in the new panel.  However,  the tab group in the source panel will detect
    // the change in selected index and fire this event which changes focus back to this panel.
    // if(index < 0 || index >= this.viewers.length) return;
    // let viewerId = this.viewers[index].viewerId;
    // if (viewerId != this.selectedViewerId || !this.hasFocus) {
    //   this.store.dispatch(new SetFocusedViewer(viewerId));
    // }
  }

  drop(event: CdkDragDrop<string[]>) {
    var srcPanelId = event.previousContainer.id;
    var targetPanelId = event.container.id;
    let viewer: IViewer = event.item.data;

    this.store.dispatch(new MoveViewer(viewer.id, srcPanelId, targetPanelId, event.currentIndex));
  }

  splitViewerPanel(viewerId: string, direction: 'up' | 'down' | 'left' | 'right') {
    this.store.dispatch(new SplitViewerPanel(viewerId, direction));
  }
}
