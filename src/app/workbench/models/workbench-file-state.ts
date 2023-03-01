import { PlottingPanelState } from './plotter-file-state';
import { CustomMarkerPanelState } from './marker-file-state';
import { LayerType } from '../../data-files/models/data-file-type';

export enum WorkbenchStateType {
  FILE = 'file',
  IMAGE_LAYER = 'image',
  TABLE_LAYER = 'table',
}
export interface IWorkbenchState {
  id: string;
  type: WorkbenchStateType;
}

export interface WorkbenchFileState extends IWorkbenchState {
  type: WorkbenchStateType.FILE;
}

export interface WorkbenchImageLayerState extends IWorkbenchState {
  type: WorkbenchStateType.IMAGE_LAYER;
}

export interface WorkbenchTableLayerState extends IWorkbenchState {
  type: WorkbenchStateType.TABLE_LAYER;
}
