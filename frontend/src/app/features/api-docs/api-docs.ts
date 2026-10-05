import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-api-docs',
  imports: [TranslatePipe],
  templateUrl: './api-docs.html',
  styleUrl: './api-docs.scss',
})
export class ApiDocs {}
