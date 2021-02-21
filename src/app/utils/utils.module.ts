import { NgModule, ModuleWithProviders } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";

//Angular Material
import { MaterialModule } from "../material";

import { FocusableCell, CellFocuser } from "./cell-focuser/cell-focuser";
import { CorrelationIdGenerator } from "./correlated-action";
import { PrintFormErrorComponent } from './print-form-error/print-form-error.component';
import { AlertDialogComponent } from './alert-dialog/alert-dialog.component';

export const COMPONENTS = [FocusableCell, CellFocuser, PrintFormErrorComponent, AlertDialogComponent];

@NgModule({
  imports: [RouterModule, CommonModule, FormsModule, MaterialModule],

  declarations: COMPONENTS,
  exports: COMPONENTS,
  entryComponents: [AlertDialogComponent]
})
export class UtilsModule {
  static forRoot(): ModuleWithProviders<UtilsModule> {
    return {
      ngModule: UtilsModule,
      providers: [CorrelationIdGenerator],
    };
  }
}
