import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { UiButton } from '@shared/ui';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, TranslatePipe, UiButton],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.scss',
})
export class Forbidden {}

