import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { UiPageHeader } from '@shared/ui';

@Component({
  selector: 'app-api-docs',
  imports: [TranslatePipe, UiPageHeader],
  templateUrl: './api-docs.html',
})
export class ApiDocs {}
