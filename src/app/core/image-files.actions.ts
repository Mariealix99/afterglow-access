import { ImageFile } from '../data-files/models/data-file';
import { ImageTile } from '../data-files/models/image-tile';
import { PixelNormalizer } from './models/pixel-normalizer';
import { Region } from './models/region';
import { SonifierFileState, SonifierRegionMode } from './models/sonifier-file-state';
import { PlotterFileState } from './models/plotter-file-state';
import { PosType, Source } from './models/source';
import { Matrix } from 'svgjs';
import { SourceIdentificationFileState } from './models/source-identification-file-state';
import { SourceExtractionSettings } from '../jobs/models/source-extraction';

export class InitializeImageFileState {
  public static readonly type = '[Viewer] Initialize Image File State';

  constructor(public fileIds: string[]) { }
}

/* Normalization */
export class RenormalizeImageFile {
  public static readonly type = '[Viewer] Renormalize Image File';

  constructor(public fileId: string) { }
}

export class NormalizeImageTile {
  public static readonly type = '[Viewer] Normalize Image Tile';

  constructor(public fileId: string, public tileIndex: number) { }
}

export class UpdateNormalizer {
  public static readonly type = '[Viewer] Update Normalizer';

  constructor(public fileId: string, public changes: Partial<PixelNormalizer>) { }
}

/* Sonification */
export class UpdateSonifierRegion {
  public static readonly type = '[Sonifier] Update Region';

  constructor(public fileId: string) { }
}

export class AddRegionToHistory {
  public static readonly type = '[Sonifier] Add Region to History';

  constructor(public fileId: string, public region: Region) { }
}

export class ClearRegionHistory {
  public static readonly type = '[Sonifier] Clear Region History';

  constructor(public fileId: string) { }
}

export class UndoRegionSelection {
  public static readonly type = '[Sonifier] Undo Region Selection';

  constructor(public fileId: string) { }
}

export class RedoRegionSelection {
  public static readonly type = '[Sonifier] Redo Region Selection';

  constructor(public fileId: string) { }
}

export class UpdateSonifierFileState {
  public static readonly type = '[Sonifier] Update File State';

  constructor(public fileId: string, public changes: Partial<SonifierFileState>) { }
}

export class SetRegionMode {
  public static readonly type = '[Sonifier] Set Region Mode';

  constructor(public fileId: string, public mode: SonifierRegionMode) { }
}

export class UpdateSonificationUri {
  public static readonly type = '[Sonifier] Update Sonification URI';

  constructor(public fileId: string, public uri: string) { }
}

export class SetProgressLine {
  public static readonly type = '[Sonifier] Set Progress Line';

  constructor(public fileId: string, public line: { x1: number, y1: number, x2: number, y2: number }) { }
}

/* Plotting */

export class UpdatePlotterFileState {
  public static readonly type = '[Plotter] Update Plotter File State'

  constructor(public fileId: string, public changes: Partial<PlotterFileState>) { }
}

export class StartLine {
  public static readonly type = '[Plotter] Start Line'

  constructor(public fileId: string, public point: { primaryCoord: number, secondaryCoord: number, posType: PosType }) { }
}

export class UpdateLine {
  public static readonly type = '[Plotter] Update Line'

  constructor(public fileId: string, public point: { primaryCoord: number, secondaryCoord: number, posType: PosType }) { }
}

/* Transformations */

export class ZoomBy {
  public static readonly type = '[Transformation] Zoom By';

  constructor(public fileId: string, public scaleFactor: number, public viewportAnchor: { x: number, y: number }) { }
}

export class ZoomTo {
  public static readonly type = '[Transformation] Zoom To';

  constructor(public fileId: string, public scale: number, public anchorPoint: { x: number, y: number }) { }
}

export class MoveBy {
  public static readonly type = '[Transformation] Move By';

  constructor(public fileId: string, public xShift: number, public yShift: number) { }
}

export class SetImageTransform {
  public static readonly type = '[Transformation] Set Image Transform';

  constructor(public fileId: string, public transform: Matrix) { }
}

export class ResetImageTransform {
  public static readonly type = '[Transformation] Reset Image Transform';

  constructor(public fileId: string) { }
}

export class SetViewportTransform {
  public static readonly type = '[Transformation] Set Viewport Transform';

  constructor(public fileId: string, public transform: Matrix) { }
}

export class RotateBy {
  public static readonly type = '[Transformation] Rotate By';

  constructor(public fileId: string, public rotationAngle: number) { }
}

export class RotateTo {
  public static readonly type = '[Transformation] Rotate To';

  constructor(public fileId: string, public rotationAngle: number) { }
}

export class Flip {
  public static readonly type = '[Transformation] Flip';

  constructor(public fileId: string) { }
}

export class CenterRegionInViewport {
  public static readonly type = '[Transformation] Center Region In Viewport';

  constructor(public fileId: string, public region: Region, public viewportSize?: { width: number, height: number }) { }
}


export class UpdateCurrentViewportSize {
  public static readonly type = '[Transformation] Update Current Viewport Size'

  constructor(public fileId: string, public viewportSize: { width: number, height: number }) { }
}



/*Source Extractor*/
export class UpdateFilteredSources {
  public static readonly type = '[Source Extractor] Update Filtered Sources'

  constructor(public fileId: string) { }
}

export class SetSourceExtractorRegion {
  public static readonly type = '[Source Extractor] Set Region'

  constructor(public fileId: string, public region: Region) { }
}

export class UpdateSourceExtractorRegion {
  public static readonly type = '[Source Extractor] Update Region'

  constructor(public fileId: string) { }
}

export class UpdateSourceExtractorFileState {
  public static readonly type = '[Source Extractor] Update File State';

  constructor(public fileId: string, public changes: Partial<SourceIdentificationFileState>) { }
}

export class ExtractSources {
  public static readonly type = '[Source Extractor] Extract Sources'

  constructor(public fileId: string, public settings: SourceExtractionSettings) { }
}

export class ExtractSourcesSuccess {
  public static readonly type = '[Source Extractor] Extract Sources Success'

  constructor(public fileId: string, public sources: Source[]) { }
}

export class ExtractSourcesFail {
  public static readonly type = '[Source Extractor] Extract Sources Fail'

  constructor(public error: string) { }
}

export class UpdateSourceExtractorSource {
  public static readonly type = '[Source Extractor] Update Source'

  constructor(public fileId: string, public sourceId: string, public changes: Partial<Source>) { }
}

export class RemoveSelectedSources {
  public static readonly type = '[Source Extractor] Remove Selected Sources'

  constructor(public fileId: string) { }
}

export class RemoveAllSources {
  public static readonly type = '[Source Extractor] Remove All Sources'

  constructor(public fileId: string) { }
}

export class SetSourceLabel {
  public static readonly type = '[Source Extractor] Set Source Label'

  constructor(public fileId: string, public source: Source, public label: string) { }
}

