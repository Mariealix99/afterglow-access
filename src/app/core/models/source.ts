import { Mag } from "./mag";

export enum PosType {
  PIXEL = 'pixel',
  SKY = 'sky'
}

export interface Source {
  id: string;
  label: string;
  objectId: string;
  fileId: string;
  posType: PosType;
  primaryCoord: number;
  secondaryCoord: number;
  pm: number;
  pmPosAngle: number;
  pmEpoch: Date;
}


export interface CatalogSource extends Source {
  mags: {[filter: string]: Mag};
}